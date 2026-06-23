#!/usr/bin/env bash
# Idempotente: mueve los archivos binarios desde <DASHCAD_DATA_PATH>/{step,glb,thumb}
# hacia <DASHCAD_FILES_PATH>/{step,glb,thumb}, sin tocar parts.json.
# Seguro ejecutarlo varias veces: solo mueve lo que aún no existe en destino.
#
# Uso por defecto (paths del docker-compose.nas.yml):
#   bash scripts/migrate-nas-storage.sh
#
# Override:
#   CATALOG_DIR=/ruta/a/data/catalog FILES_DIR=/storage/cad \
#     bash scripts/migrate-nas-storage.sh
#
# Dry run:
#   DRY_RUN=1 bash scripts/migrate-nas-storage.sh

set -euo pipefail

CATALOG_DIR="${CATALOG_DIR:-/ZimaOS-HD/AppData/dashcad/data/catalog}"
FILES_DIR="${FILES_DIR:-/storage/cad}"
DRY_RUN="${DRY_RUN:-0}"

log() { printf '[migrate-nas-storage] %s\n' "$*"; }

if [[ ! -d "$CATALOG_DIR" ]]; then
  log "Skip: catalog dir no existe ($CATALOG_DIR). Nada que migrar."
  exit 0
fi

if [[ ! -d "$FILES_DIR" ]]; then
  log "Creating $FILES_DIR"
  if [[ "$DRY_RUN" == "1" ]]; then
    log "  (dry-run) mkdir -p $FILES_DIR"
  else
    mkdir -p "$FILES_DIR"
  fi
fi

move_subdir() {
  local sub="$1"
  local src="$CATALOG_DIR/$sub"
  local dst="$FILES_DIR/$sub"

  if [[ ! -d "$src" ]]; then
    log "Skip $sub: $src no existe"
    return 0
  fi

  if [[ -z "$(ls -A "$src" 2>/dev/null || true)" ]]; then
    log "Skip $sub: $src está vacío"
    return 0
  fi

  if [[ ! -d "$dst" ]]; then
    log "Creating $dst"
    [[ "$DRY_RUN" == "1" ]] || mkdir -p "$dst"
  fi

  local count
  count=$(find "$src" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')
  log "Moving $count entries from $src -> $dst"

  if [[ "$DRY_RUN" == "1" ]]; then
    log "  (dry-run) mv"
  else
    # -n evita pisar; los archivos que ya estén en destino se quedan donde están
    # y se reportan en el resumen final.
    mv -n "$src"/* "$dst"/ 2>/dev/null || true
    # Si src quedó con subcarpetas, intentamos moverlas también (sin pisar).
    find "$src" -mindepth 1 -maxdepth 1 -type d -exec mv -n {} "$dst"/ \; 2>/dev/null || true
  fi
}

move_subdir "step"
move_subdir "glb"
move_subdir "thumb"

# Saneamiento: si las subcarpetas quedaron vacías, las eliminamos para no
# dejar basura en el volumen del catálogo.
for sub in step glb thumb; do
  src="$CATALOG_DIR/$sub"
  if [[ -d "$src" ]] && [[ -z "$(ls -A "$src" 2>/dev/null || true)" ]]; then
    log "Removing empty $src"
    if [[ "$DRY_RUN" == "1" ]]; then
      log "  (dry-run) rmdir $src"
    else
      rmdir "$src"
    fi
  fi
done

log "Done. parts.json sigue en $CATALOG_DIR; archivos en $FILES_DIR/{step,glb,thumb}"
