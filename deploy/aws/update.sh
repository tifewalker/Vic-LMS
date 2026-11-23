#!/usr/bin/env bash
# Ship the latest main to the server. Run on the server: bash /opt/vec/deploy/aws/update.sh
set -euo pipefail

cd /opt/vec
git fetch origin
git checkout main
git pull --ff-only origin main
pnpm install --frozen-lockfile --filter api...
pnpm --filter api build
sudo systemctl restart vec-api

# Wait for the API to answer, then show the result.
for _ in $(seq 1 20); do
  if curl -fsS localhost:4000/health >/dev/null 2>&1; then
    echo "API is up: $(git log --oneline -1)"
    exit 0
  fi
  sleep 1
done
echo "API did not come up. Recent logs:" >&2
sudo journalctl -u vec-api -n 40 --no-pager >&2
exit 1
