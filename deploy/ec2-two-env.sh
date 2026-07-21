#!/usr/bin/env bash
# One-time: split the EC2 into two environments.
#   /opt/sparex-factoryos       → DEMO  (pm2 factoryos-demo, :3005, basePath /demo)  — customer-facing
#   /opt/sparex-factoryos-dev   → DEV   (pm2 factoryos-dev,  :3006, basePath /dev)   — SpareX working copy
# Expects the freshest source tarball at /tmp/factoryos-deploy.tgz.
set -euo pipefail
export NODE_OPTIONS=--max-old-space-size=2048
export SKIP_TYPECHECK=1

DEMO=/opt/sparex-factoryos
DEV=/opt/sparex-factoryos-dev

command -v rsync >/dev/null 2>&1 || dnf install -y rsync

echo "==> 1/5 create DEV as a copy of DEMO (keeps node_modules — no reinstall)"
[ -d "$DEV" ] || cp -a "$DEMO" "$DEV"

echo "==> 2/5 lay the freshest source over DEV"
rm -rf /tmp/src && mkdir -p /tmp/src
tar -xzf /tmp/factoryos-deploy.tgz -C /tmp/src
rsync -a --delete --exclude node_modules --exclude .next /tmp/src/sparex-factoryos/ "$DEV/"

echo "==> 3/5 build DEV under /dev (~10 min on t3.micro)"
cd "$DEV"
rm -rf .next
env NEXT_PUBLIC_BASE_PATH=/dev npm run build

echo "==> 4/5 pm2: factoryos-dev :3006 + rename demo app to factoryos-demo"
pm2 delete factoryos-dev >/dev/null 2>&1 || true
env PORT=3006 NEXT_PUBLIC_BASE_PATH=/dev pm2 start npm --name factoryos-dev -- start
if pm2 describe factoryos >/dev/null 2>&1; then
  pm2 delete factoryos
  cd "$DEMO"
  env PORT=3005 NEXT_PUBLIC_BASE_PATH=/demo pm2 start npm --name factoryos-demo -- start
fi
pm2 save

echo "==> 5/5 smoke"
sleep 5
curl -s -o /dev/null -w "dev  :3006/dev  → %{http_code}\n" http://127.0.0.1:3006/dev
curl -s -o /dev/null -w "demo :3005/demo → %{http_code}\n" http://127.0.0.1:3005/demo
echo "✅ two environments up (Caddy /dev route still needed)"
