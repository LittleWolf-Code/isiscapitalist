#!/usr/bin/env bash
# Déploie ISIS Capitalist sur le VPS : https://capitalist.lucaslopvet.fr (D39).
# Usage, depuis Git Bash ou Linux : deploy/deploy.sh
# Compile les deux applications, envoie une archive par SSH puis lance deploy/remote-install.sh
# sur le serveur. Variables : DEPLOY_HOST (alias SSH, défaut MonServeurAntigravity), SSH.
# Sous Windows, le ssh.exe du système est préféré à celui de Git : lui seul passe par le service
# ssh-agent de Windows, qui garde la clé déverrouillée.
set -euo pipefail

HOST="${DEPLOY_HOST:-MonServeurAntigravity}"
if [ -z "${SSH:-}" ]; then
  if [ -x /c/Windows/System32/OpenSSH/ssh.exe ]; then SSH=/c/Windows/System32/OpenSSH/ssh.exe; else SSH=ssh; fi
fi

cd "$(dirname "$0")/.."
(cd frontend && npm run build)
(cd backend && npm run build)

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/backend/src" "$STAGE/frontend"
cp -r backend/dist backend/public backend/package.json backend/package-lock.json "$STAGE/backend/"
cp backend/src/schema.graphql "$STAGE/backend/src/"
cp -r frontend/dist/frontend/browser/. "$STAGE/frontend/"
cp deploy/isiscapitalist.service deploy/capitalist.lucaslopvet.fr.conf "$STAGE/"

tar -czf - -C "$STAGE" . | "$SSH" -o BatchMode=yes "$HOST" 'cat > /tmp/isiscapitalist.tgz'
"$SSH" -o BatchMode=yes "$HOST" 'bash -s' < deploy/remote-install.sh
echo "Déployé : https://capitalist.lucaslopvet.fr"
