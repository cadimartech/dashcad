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

#### Opción 1: Docker Compose (local o NAS con build)

```bash
mkdir -p data/catalog
docker compose up -d --build
docker compose logs -f
docker compose down
```

Los datos del catálogo se guardan en `./data/catalog` (configurable con `DASHCAD_DATA_PATH` en `.env`).

#### Opción 2: NAS (Synology, ZimaOS, etc.) — sin compilar en el NAS

En tu PC (donde tienes el código):

```bash
cp .env.example .env
# Edita .env si quieres otro puerto o ruta de datos

./scripts/docker-export-for-nas.sh
# Genera dashcad-image.tar en la raíz del proyecto
```

Sube al NAS (File Station, SMB o SCP):

- `dashcad-image.tar`
- `docker-compose.nas.yml`
- `.env` (copia de `.env.example` con tus valores)

En el NAS por SSH o terminal del Container Manager:

```bash
cd /ruta/donde/subiste/los/archivos
docker load -i dashcad-image.tar
mkdir -p data/catalog
docker compose -f docker-compose.nas.yml up -d
```

Abre `http://IP-DEL-NAS:3000` (o el puerto que pusiste en `DASHCAD_PORT`).

**Synology Container Manager (GUI):** Imagen → Importar → `dashcad-image.tar`. Luego Proyecto → Crear → pegar `docker-compose.nas.yml` o crear contenedor manualmente: imagen `dashcad:latest`, puerto `3000`, volumen carpeta local `data/catalog` → `/app/catalog`.

**Ruta de datos en NAS:** en `.env` puedes usar una ruta absoluta, por ejemplo:

```env
DASHCAD_DATA_PATH=/volume1/docker/dashcad/data/catalog
```

#### Opción 3: Docker directo

```bash
docker build -t dashcad:latest .
docker run -d \
  --name dashcad \
  -p 3000:3000 \
  -v "$(pwd)/data/catalog:/app/catalog" \
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
| `DASHCAD_DATA_PATH` | Carpeta del catálogo en el host (default: `./data/catalog`) |
| `DASHCAD_CATALOG_PATH` | Ruta del JSON dentro del contenedor (default: `/app/catalog/parts.json`) |
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
