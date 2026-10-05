#!/usr/bin/env bash
# Builds the site and uploads dist/ to ling.uno over SSH with the deploy key (~/.ssh/ling_deploy).
#
#   npm run deploy                 build, check and upload
#   npm run deploy -- --dry-run    build and list what would change, without uploading
#
# Settings come from .env.local: DEPLOY_SSH (user@host), DEPLOY_SSH_PORT, DEPLOY_PATH. The SSH account also hosts
# other sites, so the target must be ling.uno's own public_html; files there that are not in dist/ are deleted.
set -euo pipefail
cd "$(dirname "$0")/.."

env_value() {
  grep -E "^$1=" .env.local 2>/dev/null | head -n 1 | cut -d= -f2- || true
}

TARGET=$(env_value DEPLOY_SSH)
PORT=$(env_value DEPLOY_SSH_PORT)
REMOTE_PATH=$(env_value DEPLOY_PATH)
KEY="$HOME/.ssh/ling_deploy"
DRY_RUN=""
[ "${1:-}" = "--dry-run" ] && DRY_RUN="--dry-run"

if [ -z "$TARGET" ] || [ -z "$PORT" ] || [ -z "$REMOTE_PATH" ]; then
  echo "DEPLOY_SSH, DEPLOY_SSH_PORT and DEPLOY_PATH must be set in .env.local" >&2
  exit 1
fi
case "$REMOTE_PATH" in
  domains/ling.uno/public_html) ;;
  *) echo "Refusing to deploy to '$REMOTE_PATH': only domains/ling.uno/public_html is allowed." >&2; exit 1 ;;
esac
[ -f "$KEY" ] || { echo "Deploy key $KEY is missing." >&2; exit 1; }

npm run build
[ -f dist/index.html ] || { echo "dist/index.html is missing; build failed?" >&2; exit 1; }
if grep -rlE "postgresql://|SUPABASE_DB_URL|service_role" dist >/dev/null; then
  echo "dist/ contains a database secret; not deploying." >&2
  exit 1
fi

# .well-known holds the hosting's SSL verification files and is never deleted.
rsync -rlptv --delete $DRY_RUN --exclude '.well-known' \
  -e "ssh -i $KEY -o IdentitiesOnly=yes -o BatchMode=yes -p $PORT" \
  dist/ "$TARGET:$REMOTE_PATH/"

[ -n "$DRY_RUN" ] && echo "Dry run: nothing was uploaded." || echo "Deployed to https://ling.uno/"
