#!/usr/bin/env bash
# SpareX FactoryOS — EC2 bootstrap for Amazon Linux 2023 (dnf-based)
# Run:  sudo bash /opt/sparex-factoryos/deploy/ec2-setup-al2023.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sparex-factoryos}"

echo "==> 1/6 swap 2G (t3.micro has 1GB — next build needs ~2GB)"
if ! swapon --show | grep -q swapfile; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> 2/6 Node 20 + pm2 + nginx"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf install -y nodejs
fi
dnf install -y nginx
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

echo "==> 3/6 app at $APP_DIR"
[ -d "$APP_DIR" ] || { echo "!! extract the project to $APP_DIR first"; exit 1; }
cd "$APP_DIR"

echo "==> 4/6 install + production build (t3.micro: ~10 min, be patient)"
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
npm run build

echo "==> 5/6 pm2 service"
pm2 delete factoryos >/dev/null 2>&1 || true
pm2 start npm --name factoryos -- start
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "==> 6/6 nginx :80 → :3000"
cat > /etc/nginx/conf.d/factoryos.conf <<'NGINX'
server {
  listen 80 default_server;
  server_name _;
  location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
  location / {
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
# AL2023's stock nginx.conf ships its own catch-all server on :80 — disable it
# so our default_server takes the port without a duplicate-default conflict.
sed -i 's/^\( *\)listen \+80;/\1listen 8099;/; s/^\( *\)listen \+\[::\]:80;/\1listen [::]:8099;/' /etc/nginx/nginx.conf || true
nginx -t
systemctl enable --now nginx
systemctl reload nginx

IP=$(curl -s --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 || echo "<EC2-IP>")
echo ""
echo "✅ done — open  http://${IP}/"
echo "   logs:     pm2 logs factoryos --lines 50"
echo "   redeploy: cd $APP_DIR && npm run build && pm2 restart factoryos"
