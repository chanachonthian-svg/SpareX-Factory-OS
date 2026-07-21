#!/usr/bin/env bash
# SpareX FactoryOS — one-shot EC2 bootstrap (Ubuntu 22.04/24.04)
# Run as root or with sudo, from anywhere:  sudo bash deploy/ec2-setup.sh
# Installs Node 20 + pm2 + nginx, builds the app, serves it on port 80.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sparex-factoryos}"
NODE_MAJOR=20

echo "==> 1/6 swap (2G) — next build needs ~2GB RAM; keeps t3.micro/small alive"
if ! swapon --show | grep -q swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> 2/6 Node ${NODE_MAJOR} + pm2 + nginx"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
apt-get install -y nginx
npm install -g pm2

echo "==> 3/6 app code"
# Option A (recommended): you already copied/cloned the repo to $APP_DIR before running this.
# Option B: set GIT_REPO=https://github.com/you/sparex-factoryos.git to clone here.
if [ ! -d "$APP_DIR" ] && [ -n "${GIT_REPO:-}" ]; then
  git clone "$GIT_REPO" "$APP_DIR"
fi
[ -d "$APP_DIR" ] || { echo "!! put the project at $APP_DIR first (scp/git), then re-run"; exit 1; }
cd "$APP_DIR"

echo "==> 4/6 install + production build"
npm ci || npm install
npm run build

echo "==> 5/6 pm2 service (auto-restart + boot persistence)"
pm2 delete factoryos >/dev/null 2>&1 || true
pm2 start npm --name factoryos -- start   # next start → :3000
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null || true

echo "==> 6/6 nginx reverse proxy :80 → :3000"
cat > /etc/nginx/sites-available/factoryos <<'NGINX'
server {
  listen 80 default_server;
  server_name _;
  # Next.js static assets — long cache
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
    proxy_set_header Upgrade $http_upgrade;      # HMR/websocket safe
    proxy_set_header Connection "upgrade";
  }
}
NGINX
ln -sf /etc/nginx/sites-available/factoryos /etc/nginx/sites-enabled/factoryos
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

IP=$(curl -s --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 || echo "<EC2-public-IP>")
echo ""
echo "✅ done — open  http://${IP}/"
echo "   logs:     pm2 logs factoryos"
echo "   redeploy: cd $APP_DIR && git pull && npm run build && pm2 restart factoryos"
