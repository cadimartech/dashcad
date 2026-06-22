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

#### Opción 1: Docker Compose (Recomendado)

```bash
# Construir y levantar el contenedor
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

El catálogo se persiste en un volumen Docker llamado `catalog_data`.

#### Opción 2: Docker directo

```bash
# Construir la imagen
docker build -t dashcad .

# Ejecutar con volumen para persistencia
docker run -d \
  --name dashcad \
  -p 3000:3000 \
  -v dashcad-catalog:/app/catalog \
  dashcad

# Ver logs
docker logs -f dashcad

# Detener
docker stop dashcad
```

#### Variables de entorno

Copia `.env.example` a `.env` y ajusta según necesites:

```bash
cp .env.example .env
```

Variables disponibles:
- `PORT` - Puerto del servidor (default: 3000)
- `DASHCAD_CATALOG_PATH` - Ruta del catálogo (default: /app/catalog/parts.json)
- `MAX_UPLOAD_SIZE` - Tamaño máximo de upload en bytes (default: 10485760)

#### Persistencia de datos

Los datos del catálogo (archivos STEP, GLB, thumbnails y parts.json) se almacenan en `/app/catalog` dentro del contenedor. Usa volúmenes Docker para persistir estos datos:

```bash
# Con docker-compose (automático)
docker-compose up -d

# Con docker run manual
docker run -d -v /ruta/local/catalog:/app/catalog dashcad
```

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
