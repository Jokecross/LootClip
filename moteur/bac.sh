#!/bin/bash
# Prépare la machine si besoin, puis lance le travail demandé.
# Sur une machine copiée de la base, tout est déjà prêt et on passe directement au travail.
#   bash bac.sh                     → préparation seule (base)
#   bash bac.sh tache.json          → un montage GTA (bac.mjs)
#   bash bac.sh clips tache.json    → un lot « lien → clips » (bac-clips.mjs)
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f .pret ]; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends ffmpeg fonts-noto-color-emoji python3 python3-venv curl ca-certificates >/dev/null
  npm ci --omit=dev --no-audit --no-fund --silent
  touch .pret
fi
if [ ! -f .pret-clips ]; then
  # Cadrage sur les visages (OpenCV) et récupération des vidéos depuis un lien (yt-dlp)
  python3 -m venv /opt/xpclip-venv 2>/dev/null || sudo python3 -m venv /opt/xpclip-venv
  sudo chown -R "$(id -u)" /opt/xpclip-venv 2>/dev/null || true
  /opt/xpclip-venv/bin/pip install -q --no-cache-dir opencv-python-headless numpy
  mkdir -p modeles
  curl -sSL -o modeles/yunet.onnx https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
  sudo curl -sSL -o /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux
  sudo chmod +x /usr/local/bin/yt-dlp
  touch .pret-clips
fi
export PYTHON=/opt/xpclip-venv/bin/python MODELE_VISAGES="$PWD/modeles/yunet.onnx" YTDLP=/usr/local/bin/yt-dlp
if [ "${1:-}" = "clips" ]; then
  # yt-dlp à jour à chaque lot : YouTube change souvent, une base ancienne finirait par échouer.
  sudo timeout 60 /usr/local/bin/yt-dlp -U >/dev/null 2>&1 || true
  exec node bac-clips.mjs "$2"
fi
if [ $# -gt 0 ]; then exec node bac.mjs "$1"; fi
