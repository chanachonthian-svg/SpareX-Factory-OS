#!/usr/bin/env bash
# Finish the sparexth.com/demo deploy on Amazon Linux 2023:
# rebuild under /demo, run via pm2, serve behind nginx with / → /demo redirect.
set -euo pipefail

APP_DIR=/opt/sparex-factoryos
cd "$APP_DIR"

echo "==> build with basePath /demo (heap raised, typecheck skipped — tsc gates locally)"
export NEXT_PUBLIC_BASE_PATH=/demo
export NODE_OPTIONS=--max-old-space-size=2048
export SKIP_TYPECHECK=1
rm -rf .next
npm run build

echo "==> pm2 service (env baked in)"
pm2 delete factoryos >/dev/null 2>&1 || true
NEXT_PUBLIC_BASE_PATH=/demo pm2 start npm --name factoryos -- start
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "==> nginx: sparexth.com/demo → :3000, / redirects to /demo"
cat > /etc/nginx/conf.d/factoryos.conf <<'NGINX'
server {
  listen 80 default_server;
  server_name sparexth.com www.sparexth.com _;

  # temporary until the company site lands at / — one line to change later
  location = / { return 302 /demo; }

  location /demo {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
NGINX
# stock AL2023 nginx.conf ships its own catch-all :80 server — move it off the port
sed -i 's/^\( *\)listen \+80;/\1listen 8099;/; s/^\( *\)listen \+\[::\]:80;/\1listen [::]:8099;/' /etc/nginx/nginx.conf || true
nginx -t
systemctl enable --now nginx
systemctl reload nginx

sleep 3
echo "==> smoke test"
curl -s -o /dev/null -w "localhost:3000/demo → %{http_code}\n" http://127.0.0.1:3000/demo
curl -s -o /dev/null -w "nginx :80 /demo   → %{http_code}\n" http://127.0.0.1/demo
echo "✅ done — http://sparexth.com/demo"
