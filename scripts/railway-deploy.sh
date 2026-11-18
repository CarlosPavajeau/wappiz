#!/usr/bin/env bash
# Deploys the API from its GitHub source and waits until it serves the new revision, so the pipeline
# deploys the web app only once the API it calls is live. Called by .github/workflows/deploy.yml.
#
#   scripts/railway-deploy.sh
#
# Needs RAILWAY_TOKEN (a project token for the production environment), API_URL (the API's public URL),
# GITHUB_SHA (the commit being deployed), jq and a git checkout whose origin is the repository.
#
# Railway builds from its GitHub source rather than from an upload, so each deployment shows its commit,
# message and author. `railway redeploy --from-source` cannot pick a commit, though: it always builds the
# head of main. Deploying any other commit would ship code the earlier jobs did not migrate for, so this
# refuses to run unless GITHUB_SHA is still the head of main (scripts/require-main-head.sh).
set -euo pipefail

SERVICE=api
: "${API_URL:?API_URL is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
# Covers the Docker build on Railway plus the 120 s health check.
TIMEOUT_SECONDS=${RAILWAY_DEPLOY_TIMEOUT:-900}

# Checked again here, right before Railway picks the commit: main may have moved while the database migrated.
"$(dirname "$0")/require-main-head.sh"

# Epoch seconds: Railway's createdAt has milliseconds (23:05:27.920Z), so comparing it as text with a
# timestamp in whole seconds (23:05:27Z) misses a deployment created in the same second.
started_at=$(date -u +%s)

# Railway only provides RAILWAY_GIT_COMMIT_SHA to deploys GitHub triggers, not to redeploys, so the
# Dockerfile reads the revision from this variable, which Railway passes as a build argument.
railway variable set "APP_REVISION=$GITHUB_SHA" --service "$SERVICE" --skip-deploys
railway redeploy --from-source --yes --service "$SERVICE"

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

  # The newest deployment created after this script started is the one the redeploy just made.
  status=$(railway deployment list --service "$SERVICE" --limit 5 --json |
    jq -r --argjson since "$started_at" \
      '[.[] | select((.createdAt | sub("\\.[0-9]+"; "") | fromdateiso8601) >= $since)] | first | .status // "PENDING"')
  case "$status" in
    FAILED | CRASHED | REMOVED | SKIPPED)
      echo "::error::$SERVICE deployment ended as $status. Check its logs with: railway logs --service $SERVICE"
      exit 1
      ;;
  esac
  echo "    $status (serving ${revision:-nothing})"
  sleep 10
done

echo "::error::$SERVICE still serves '${revision:-nothing}' after ${TIMEOUT_SECONDS}s, expected $GITHUB_SHA"
exit 1
