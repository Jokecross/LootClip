#!/bin/bash
# Prépare la machine si besoin (FFmpeg + modules), puis monte la vidéo.
# Sur une machine copiée de la base, tout est déjà prêt et on passe directement au montage.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f .pret ]; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends ffmpeg >/dev/null
  npm ci --omit=dev --no-audit --no-fund --silent
  touch .pret
fi
if [ $# -gt 0 ]; then exec node bac.mjs "$1"; fi
