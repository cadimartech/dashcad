# DashCAD 🏗️

Visor y catálogo de modelos CAD 3D. Sube archivos **STEP**, conviértelos a **GLB** y visualízalos en el navegador con Three.js.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Server Components) |
| Lenguaje | TypeScript 5 |
| UI | Tailwind CSS 4 + Geist font |
| Visualización 3D | Three.js via `@react-three/fiber` + `@react-three/drei` |
| Conversión CAD | `occt-import-js` (Open CASCADE Technology — WebAssembly) |
| Testing | Vitest |
| Runtime | Node.js (dev/build), tsx (scripts) |

## Funcionalidades

- **Subida de archivos STEP** — Arrastra o selecciona archivos STEP/STP
- **Conversión async STEP→GLB** — Cola de conversión server-side con estados: `pending → converting → ready | failed`
- **Visor 3D** — Preview interactivo con órbita, zoom y modo automático (GLB directo en navegadores compatibles, fallback OCCT WebAssembly)
- **Catálogo** — Listado, búsqueda y detalle de partes
- **CRUD de partes** — Subir, editar metadata, eliminar (con limpieza de assets)
- **Miniaturas** — Generación y visualización de thumbnails
- **Tema oscuro/claro** — Theme toggle con guardado en localStorage
- **Backfill** — Script para convertir partes existentes a GLB

## Storage

El app separa **metadata** de **archivos binarios** para que puedas montarlos en volúmenes, discos o servicios de almacenamiento distintos:

| Qué | Variable env | Default | En el NAS |
|---|---|---|---|
| Metadata (`parts.json`) | `DASHCAD_CATALOG_PATH` (o `DASHCAD_DATA_PATH`) | `./data/catalog/parts.json` | `/ZimaOS-HD/AppData/dashcad/data/catalog` |
| Archivos binarios (STEP/GLB/thumb) | `DASHCAD_FILES_PATH` | `./data/files` | `/storage/cad` |

Si no defines `DASHCAD_FILES_PATH`, los archivos caen en `<DASHCAD_DATA_PATH>/{step,glb,thumb}/` (modo retrocompatible con la versión 0.1.x). El helper vive en `src/lib/paths.ts`.

## Empezar

### Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Abrir http://localhost:3000
```

### Docker

#### Opción 1: Desde GitHub Container Registry (Recomendado para NAS)

La imagen se publica automáticamente en `ghcr.io/cadimartech/dashcad` cada vez que haces push a `main`.

**En tu NAS (Synology, ZimaOS, etc.):**

1. Autenticarse en GitHub Container Registry (solo la primera vez):

```bash
docker login ghcr.io -u TU_USUARIO_GITHUB
```

Usa tu token de GitHub con permisos `read:packages`.

2. Crear la estructura de carpetas. Por defecto la app separa metadata y archivos:

```bash
# Metadata (parts.json)
mkdir -p /ZimaOS-HD/AppData/dashcad/data/catalog

# Archivos binarios (STEP, GLB, thumbnails) — separados del catálogo
mkdir -p /storage/cad/{step,glb,thumb}
```

3. (Solo si vienes de una versión anterior) Migrar los archivos existentes:

```bash
bash scripts/migrate-nas-storage.sh
```

El script es idempotente: mueve `step/`, `glb/`, `thumb/` desde `data/catalog` hacia `/storage/cad` sin tocar el `parts.json`. Es seguro ejecutarlo varias veces.

4. Desplegar con Docker Compose:

```bash
docker compose -f docker-compose.nas.yml pull
docker compose -f docker-compose.nas.yml up -d
```

Abre `http://IP-DEL-NAS:3000`.

**Para actualizar:**

```bash
docker compose -f docker-compose.nas.yml pull
docker compose -f docker-compose.nas.yml up -d
```

#### Opción 2: Docker Compose local (con build)

```bash
mkdir -p data/catalog data/files/{step,glb,thumb}
docker compose up -d --build
docker compose logs -f
docker compose down
```

La metadata se guarda en `./data/catalog/parts.json` (configurable con `DASHCAD_DATA_PATH`) y los archivos binarios en `./data/files/{step,glb,thumb}` (configurable con `DASHCAD_FILES_PATH`). Mantenerlos separados permite montar el catálogo y los archivos en volúmenes, discos o servicios de almacenamiento distintos.

#### Opción 3: Exportar imagen manualmente (sin GitHub Actions)

Si no quieres usar GitHub Actions, puedes construir y exportar la imagen localmente:

```bash
./scripts/docker-export-for-nas.sh
```

Esto genera `dashcad-image.tar`. Súbela al NAS y cárgala:

```bash
docker load -i dashcad-image.tar
docker compose -f docker-compose.nas.yml up -d
```

#### Opción 4: Docker directo

```bash
docker build -t dashcad:latest .
docker run -d \
  --name dashcad \
  -p 3000:3000 \
  -v "$(pwd)/data/catalog:/app/catalog" \
  -v "$(pwd)/data/files:/app/files" \
  -e DASHCAD_FILES_PATH=/app/files \
  --restart unless-stopped \
  dashcad:latest
```

#### Variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `DASHCAD_PORT` | Puerto en el host (default: `3000`) |
| `DASHCAD_DATA_PATH` | Carpeta del catálogo (solo `parts.json`) en el host (default: `./data/catalog`) |
| `DASHCAD_CATALOG_PATH` | Ruta del JSON dentro del contenedor (default: `/app/catalog/parts.json`) |
| `DASHCAD_FILES_PATH` | Carpeta de archivos binarios (STEP, GLB, thumbnails) en el host. Si no se define, cae en `<DASHCAD_DATA_PATH>` (comportamiento retrocompatible). |
| `MAX_UPLOAD_SIZE` | Tamaño máximo de upload en bytes (default: 10MB) |

#### Health check

El contenedor comprueba `GET /api/health`. Si el healthcheck falla en el NAS, revisa que el puerto no esté ocupado y que `data/catalog` sea escribible por el contenedor.

## Scripts

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # ESLint
npm run test         # Tests unitarios (Vitest)
npm run test:watch   # Tests en watch mode
npm run migrate-glb  # Backfill: convierte partes existentes a GLB
```

## API Routes

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/parts` | Listar todas las partes |
| `POST` | `/api/upload` | Subir archivo STEP |
| `GET` | `/api/parts/[id]` | Obtener detalle de una parte |
| `PUT` | `/api/parts/[id]` | Actualizar metadata de una parte |
| `DELETE` | `/api/parts/[id]` | Eliminar una parte y sus assets |
| `POST` | `/api/parts/[id]/thumbnail` | Subir/generar thumbnail |
| `GET` | `/api/step/[filename]` | Servir archivo STEP |
| `GET` | `/api/glb/[filename]` | Servir archivo GLB |
| `GET` | `/api/thumb/[filename]` | Servir thumbnail |

## Pipeline de conversión

```
Upload STEP → API route escribe archivo y registra parte
           → ConversionQueue procesa en segundo plano
           → occt-import-js triangula y genera GLB
           → ConversionCatalogSync actualiza status en catálogo
           → UI hace polling (conversion-detail-poll) hasta status "ready"
```

El status de conversión se persiste en el catálogo JSON y se expone via API para que la UI pueda mostrar badges y estados.

## Estructura del proyecto

```
src/
├── app/
│   ├── api/           # API routes (upload, parts, step, glb, thumb)
│   ├── parts/[id]/    # Página de detalle con visor 3D
│   ├── upload/        # Página de subida
│   ├── layout.tsx     # Layout raíz
│   └── page.tsx       # Página principal (catálogo)
├── components/        # Componentes React (visor, badges, upload form, etc.)
├── lib/               # Lógica de negocio (conversión, validación, catálogo)
└── types/             # TypeScript declarations
scripts/
└── migrate-glb.ts     # Backfill script
```

## Testing

```bash
npm test
```

Los tests cubren:

- **Upload validation** — Extensiones, tamaño máximo, sanitización
- **Parts CRUD** — Catálogo, metadatos, eliminación
- **Conversión** — Queue, status, catalog sync
- **Mesh builder** — Construcción de geometría Three.js desde mesh OCCT
- **Step converter** — Integración con occt-import-js

## Limitaciones / Pendientes

- ⚠️ **Sin autenticación** — Todas las API routes son públicas. No hay sesión, ownership ni permisos.
- ⚠️ **Persistencia en archivo JSON** — El catálogo actualmente usa un archivo JSON local. No hay base de datos.
- ⚠️ **Sin tests E2E** — No hay tests de integración con navegador.
- ⚠️ **Frontera Server/Client** — Varios componentes cliente podrían ser Server Components para mejor performance.
- 📝 **README** — Este arch solía ser el template de create-next-app.
