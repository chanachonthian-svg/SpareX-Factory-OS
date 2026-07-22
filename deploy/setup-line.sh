#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Turn ON real LINE alerts for FactoryOS.
#
#  HOW TO USE
#   1) Create a LINE Official Account + Messaging API channel (free) at
#      https://developers.line.biz  →  copy the "Channel access token (long-lived)".
#   2) SSH into the server:
#        ssh -i ~/.ssh/sparex-production.pem ec2-user@18.235.152.233
#   3) Paste TOKEN below, then paste this whole script into the terminal and Enter.
#
#  You do NOT need a group ID. Leave TARGET empty and alerts broadcast to everyone
#  who added your LINE OA as a friend. (Set TARGET only if you want one specific
#  group/user — paste its id, e.g. Cxxxxxxxx or Uxxxxxxxx.)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── fill this in ──
TOKEN="PASTE_YOUR_LINE_CHANNEL_ACCESS_TOKEN_HERE"
TARGET=""          # optional; empty = broadcast to all OA friends

# ── stop if the token wasn't filled in ──
if [ -z "$TOKEN" ] || [ "$TOKEN" = "PASTE_YOUR_LINE_CHANNEL_ACCESS_TOKEN_HERE" ]; then
  echo "✗ Please paste your LINE channel token into TOKEN= first."; exit 1
fi

ENV=/opt/factoryos.env

# ── write the LINE vars into the shared env (backup first, no duplicates) ──
sudo cp "$ENV" "$ENV.bak-line-$(date +%s)" 2>/dev/null || true
sudo sed -i '/^LINE_CHANNEL_TOKEN=/d; /^LINE_TARGET_ID=/d' "$ENV"
echo "LINE_CHANNEL_TOKEN=$TOKEN" | sudo tee -a "$ENV" >/dev/null
[ -n "$TARGET" ] && echo "LINE_TARGET_ID=$TARGET" | sudo tee -a "$ENV" >/dev/null
sudo chmod 600 "$ENV"
echo "✓ saved LINE token to $ENV"

# ── reload the env into the running apps (no rebuild needed) ──
sudo bash -c 'set -a; . /opt/factoryos.env; set +a
  for app in factoryos-dev factoryos-demo factoryos-hosei; do
    pm2 restart "$app" --update-env >/dev/null 2>&1 && echo "✓ reloaded $app" || true
  done'

# ── fire a real test through the app so you see it land in LINE ──
echo "-- sending a LINE test --"
curl -s -X POST http://127.0.0.1:3006/dev/api/notify \
  -H 'Content-Type: application/json' \
  -d '{"test":true,"emailOn":false,"lineOn":true}'
echo
echo "If it shows \"line\":\"sent\" — check your LINE. Done ✅"
