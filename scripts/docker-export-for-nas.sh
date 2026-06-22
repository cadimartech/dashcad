#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE_NAME="${DASHCAD_IMAGE:-dashcad:latest}"
OUTPUT="${1:-$ROOT/dashcad-image.tar}"

cd "$ROOT"

echo "→ Construyendo imagen $IMAGE_NAME ..."
docker build -t "$IMAGE_NAME" .

echo "→ Exportando a $OUTPUT ..."
docker save "$IMAGE_NAME" -o "$OUTPUT"

echo ""
echo "Listo. Sube al NAS:"
echo "  - $OUTPUT"
echo "  - docker-compose.nas.yml"
echo "  - .env.example (renómbralo a .env en el NAS)"
echo ""
echo "En el NAS:"
echo "  docker load -i dashcad-image.tar"
echo "  mkdir -p data/catalog"
echo "  docker compose -f docker-compose.nas.yml up -d"
