#!/usr/bin/env bash
# Fails unless GITHUB_SHA is the head of main. Railway builds the API from the head of main and cannot pick
# another commit, so a pipeline run for any other commit (one queued behind a newer push, or an earlier run
# re-run by hand) must not migrate or deploy. Needs a git checkout whose origin is the repository.
#
# To roll back, use Rollback on a previous deployment in Railway (it reuses that image) or revert on main.
set -euo pipefail

: "${GITHUB_SHA:?GITHUB_SHA is required}"

head=$(git ls-remote origin refs/heads/main | cut -f1)
if [ "$head" != "$GITHUB_SHA" ]; then
  echo "::error::$GITHUB_SHA is not the head of main ($head), and Railway only builds the head. The run for the head deploys it; to roll back, use Rollback in Railway or revert on main."
  exit 1
fi
