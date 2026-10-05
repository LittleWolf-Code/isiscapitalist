#!/usr/bin/env bash
# Exécuté SUR le VPS par deploy/deploy.sh (ssh ... 'bash -s' < remote-install.sh), après l'envoi
# de l'archive /tmp/isiscapitalist.tgz. Installe ou met à jour l'application (D39) :
#   /opt/isiscapitalist/frontend          build Angular (servi par Nginx)
#   /opt/isiscapitalist/backend           dist/, public/, src/schema.graphql, node_modules (prod)
#   /opt/isiscapitalist/backend/userworlds  mondes des joueurs — jamais écrasés par un déploiement
set -euo pipefail

APP=/opt/isiscapitalist
DOMAIN=capitalist.lucaslopvet.fr
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE" /tmp/isiscapitalist.tgz' EXIT

tar -xzf /tmp/isiscapitalist.tgz -C "$STAGE"

# Utilisateur système du backend (première installation).
id capitalist >/dev/null 2>&1 || sudo useradd --system --no-create-home --shell /usr/sbin/nologin capitalist

# Code : remplacé à chaque déploiement, sauf les mondes, les dépendances et le graphql.ts généré.
sudo mkdir -p "$APP/backend" "$APP/frontend"
sudo rsync -a --delete --exclude /userworlds/ --exclude /node_modules/ --exclude /src/graphql.ts \
  "$STAGE/backend/" "$APP/backend/"
sudo rsync -a --delete "$STAGE/frontend/" "$APP/frontend/"
(cd "$APP/backend" && sudo npm ci --omit=dev --no-audit --no-fund --loglevel=error)
sudo mkdir -p "$APP/backend/userworlds"
sudo chown -R capitalist:capitalist "$APP/backend/userworlds" "$APP/backend/src"

# Service systemd du backend.
sudo install -m 644 "$STAGE/isiscapitalist.service" /etc/systemd/system/isiscapitalist.service
sudo systemctl daemon-reload
sudo systemctl enable --quiet isiscapitalist
sudo systemctl restart isiscapitalist

# Certificat (première installation seulement), puis site Nginx.
if ! sudo test -e "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
  sudo certbot certonly --nginx --non-interactive -d "$DOMAIN"
fi
sudo install -m 644 "$STAGE/$DOMAIN.conf" "/etc/nginx/sites-available/$DOMAIN.conf"
sudo ln -sfn "../sites-available/$DOMAIN.conf" "/etc/nginx/sites-enabled/$DOMAIN.conf"
sudo nginx -t
sudo systemctl reload nginx

sleep 3
systemctl is-active isiscapitalist
