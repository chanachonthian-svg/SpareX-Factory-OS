#!/usr/bin/env bash
# Promote the DEV environment to DEMO (customer-facing).
# Copies source from /opt/sparex-factoryos-dev over /opt/sparex-factoryos,
# rebuilds under /demo, restarts pm2 factoryos-demo. Run: sudo bash promote-demo.sh
set -euo pipefail
export NODE_OPTIONS=--max-old-space-size=2048
export SKIP_TYPECHECK=1
# SMTP/OTP secrets — kept outside the app dirs so rsync --delete never eats them
set -a; . /opt/factoryos.env 2>/dev/null || true; set +a

DEMO=/opt/sparex-factoryos
DEV=/opt/sparex-factoryos-dev

echo "==> sync source DEV → DEMO (node_modules/.next untouched)"
rsync -a --delete --exclude node_modules --exclude .next "$DEV/" "$DEMO/"

echo "==> rebuild DEMO under /demo (~10 min)"
cd "$DEMO"
npm install --no-audit --no-fund
rm -rf .next
env NEXT_PUBLIC_BASE_PATH=/demo npm run build

echo "==> restart (fresh start so pm2 captures the env file)"
pm2 delete factoryos-demo >/dev/null 2>&1 || true
env PORT=3005 NEXT_PUBLIC_BASE_PATH=/demo pm2 start npm --name factoryos-demo -- start
pm2 save
sleep 5
curl -s -o /dev/null -w "demo :3005/demo → %{http_code}\n" http://127.0.0.1:3005/demo
echo "✅ promoted — https://sparexth.com/demo now matches /dev"
