#!/usr/bin/env bash
# Deploys the API at exactly GITHUB_SHA from its GitHub source and waits until it serves that revision, so
# the pipeline deploys the web app only once the API it calls is live. Called by .github/workflows/deploy.yml.
#
#   scripts/railway-deploy.sh
#
# Needs RAILWAY_TOKEN (a project token for the production environment), API_URL (the API's public URL),
# GITHUB_SHA (the commit being deployed) and jq.
#
# Railway builds from its GitHub source rather than from an upload, so each deployment shows its commit,
# message and author. The CLI cannot pick a commit (`railway redeploy --from-source` builds whatever main
# points to when Railway reads it, which a push can move after this run migrated the database), so this
# calls Railway's API with the commit. Re-running an earlier commit's pipeline therefore deploys that
# commit, which is how to roll back.
set -euo pipefail

SERVICE=api
: "${RAILWAY_TOKEN:?RAILWAY_TOKEN is required}"
: "${API_URL:?API_URL is required}"
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

# Railway routes traffic to a deployment only once /health/ready answers 200, and the endpoint reports
# the revision it was built from, so this revision answering is what proves the deploy is live. The
# deployment status only serves to fail fast when the build or the health check fails.
echo "==> Waiting for $SERVICE to serve $GITHUB_SHA"
deadline=$((SECONDS + TIMEOUT_SECONDS))
while ((SECONDS < deadline)); do
  revision=$(curl -fsS --max-time 5 "${API_URL%/}/health/ready" | jq -r '.revision' || true)
  if [ "$revision" = "$GITHUB_SHA" ]; then
    echo " ✓ $SERVICE is serving $GITHUB_SHA"
    exit 0
  fi

  status=$(railway deployment list --service "$SERVICE" --limit 10 --json |
    jq -r --arg id "$deployment_id" '[.[] | select(.id == $id)] | first | .status // "PENDING"')
  case "$status" in
    FAILED | CRASHED | REMOVED | SKIPPED)
      echo "::error::$SERVICE deployment $deployment_id ended as $status. Check its logs with: railway logs --service $SERVICE"
      exit 1
      ;;
  esac
  echo "    $status (serving ${revision:-nothing})"
  sleep 10
done

echo "::error::$SERVICE still serves '${revision:-nothing}' after ${TIMEOUT_SECONDS}s, expected $GITHUB_SHA"
exit 1
