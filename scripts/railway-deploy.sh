#!/usr/bin/env bash
# Deploys the API at exactly GITHUB_SHA from its GitHub source and waits until that deployment is live, so
# the pipeline deploys the web app only once the API it calls is live. Called by .github/workflows/deploy.yml.
#
#   scripts/railway-deploy.sh
#
# Needs RAILWAY_TOKEN (a project token for the production environment), GITHUB_SHA (the commit being
# deployed) and jq.
#
# Railway builds from its GitHub source rather than from an upload, so each deployment shows its commit,
# message and author. The CLI cannot pick a commit (`railway redeploy --from-source` builds whatever main
# points to when Railway reads it, which a push can move after this run migrated the database), so this
# calls Railway's API with the commit. Re-running an earlier commit's pipeline therefore deploys that
# commit, which is how to roll back.
set -euo pipefail

SERVICE=api
: "${RAILWAY_TOKEN:?RAILWAY_TOKEN is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
# Covers the Docker build on Railway plus the 120 s health check.
TIMEOUT_SECONDS=${RAILWAY_DEPLOY_TIMEOUT:-900}

status_json=$(railway status --json)
environment_id=$(jq -r '.environments.edges[0].node.id // empty' <<<"$status_json")
service_id=$(jq -r --arg name "$SERVICE" '.services.edges[].node | select(.name == $name) | .id' <<<"$status_json")
if [ -z "$environment_id" ] || [ -z "$service_id" ]; then
  echo "::error::Could not find the $SERVICE service and its environment with this RAILWAY_TOKEN"
  exit 1
fi

# Railway only provides RAILWAY_GIT_COMMIT_SHA to deploys GitHub triggers, not to API deploys, so the
# Dockerfile reads the revision from this variable, which Railway passes as a build argument.
railway variable set "APP_REVISION=$GITHUB_SHA" --service "$SERVICE" --skip-deploys

echo "==> Deploying $SERVICE at $GITHUB_SHA"
response=$(jq -n --arg serviceId "$service_id" --arg environmentId "$environment_id" --arg commitSha "$GITHUB_SHA" '{
    query: "mutation ($serviceId: String!, $environmentId: String!, $commitSha: String) { serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId, commitSha: $commitSha) }",
    variables: { serviceId: $serviceId, environmentId: $environmentId, commitSha: $commitSha }
  }' |
  curl -fsS https://backboard.railway.com/graphql/v2 \
    -H "Project-Access-Token: $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    --data @-)
deployment_id=$(jq -r '.data.serviceInstanceDeployV2 // empty' <<<"$response")
if [ -z "$deployment_id" ]; then
  echo "::error::Railway did not create a deployment: $(jq -c '.errors // .' <<<"$response")"
  exit 1
fi
echo "    deployment $deployment_id"

# Railway marks a deployment SUCCESS only once its /health/ready answers 200 and traffic moves to it, and
# this deployment is the one built from GITHUB_SHA, so SUCCESS proves the revision is live. The check runs
# inside Railway: polling the public URL from here would go through Cloudflare, whose bot protection
# challenges requests from GitHub's runners.
echo "==> Waiting for deployment $deployment_id to go live"
deadline=$((SECONDS + TIMEOUT_SECONDS))
while ((SECONDS < deadline)); do
  status=$(railway deployment list --service "$SERVICE" --limit 10 --json |
    jq -r --arg id "$deployment_id" '[.[] | select(.id == $id)] | first | .status // "PENDING"')
  case "$status" in
    SUCCESS)
      echo " ✓ $SERVICE is serving $GITHUB_SHA"
      exit 0
      ;;
    FAILED | CRASHED | REMOVED | SKIPPED)
      echo "::error::$SERVICE deployment $deployment_id ended as $status. Check its logs with: railway logs --service $SERVICE"
      exit 1
      ;;
  esac
  echo "    $status"
  sleep 10
done

echo "::error::$SERVICE deployment $deployment_id was not live after ${TIMEOUT_SECONDS}s"
exit 1
