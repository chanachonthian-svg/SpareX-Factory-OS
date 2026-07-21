#!/bin/bash
# Build + (re)start the DEV environment. Lives at /opt/build-dev.sh on the EC2.
# SMTP/OTP secrets live in /opt/factoryos.env (outside the app dirs so rsync
# --delete never removes them); pm2 captures them at start.
set -euo pipefail
export NODE_OPTIONS=--max-old-space-size=2048 SKIP_TYPECHECK=1
set -a; . /opt/factoryos.env 2>/dev/null || true; set +a

cd /opt/sparex-factoryos-dev
# free RAM for the build — the 1GB box OOM-kills the compiler otherwise;
# dev goes briefly offline during builds, which is acceptable for a working copy
pm2 stop factoryos-dev >/dev/null 2>&1 || true
npm install --no-audit --no-fund
rm -rf .next
env NEXT_PUBLIC_BASE_PATH=/dev npm run build
pm2 delete factoryos-dev >/dev/null 2>&1 || true
env PORT=3006 NEXT_PUBLIC_BASE_PATH=/dev pm2 start npm --name factoryos-dev -- start
pm2 save
sleep 6
curl -s -o /dev/null -w 'dev  :3006/dev  -> %{http_code}\n' http://127.0.0.1:3006/dev
curl -s -o /dev/null -w 'demo :3005/demo -> %{http_code}\n' http://127.0.0.1:3005/demo
echo BUILD_DEV_ALL_DONE
