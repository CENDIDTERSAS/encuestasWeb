# Equipos Biomedicos - Guia para replicar en otro proyecto

Este README sirve como plantilla para crear el mismo modulo (Hoja de Vida + Mantenimientos) en otro proyecto,
separando frontend y backend con Supabase en el backend.

## Estructura recomendada

```
mi-proyecto/
  backend/
  frontend/
```

## Requisitos

- Node.js 18+
- Una cuenta y proyecto en Supabase

## 1) Backend (Supabase en servidor)

### Inicializar

```
mkdir backend
cd backend
npm init -y
npm i express cors dotenv multer @supabase/supabase-js
```

### Archivo `.env`

Crear `.env` con:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=mantenimientos
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

### Tablas en Supabase

Ejecuta este SQL en tu proyecto Supabase:

```
create table if not exists equipos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  marca text not null,
  modelo text not null,
  sn text not null unique,
  ubicacion text not null,
  clase_riesgo text not null,
  registro_invima text not null,
  imagen_url text,
  contrato_activo boolean not null default false,
  contrato_entidad text,
  contrato_contacto text,
  contrato_numero text,
  contrato_inicio date,
  contrato_fin date,
  contrato_visitas_total integer,
  contrato_visitas_realizadas integer,
  created_at timestamptz not null default now()
);

create table if not exists mantenimientos (
  id uuid primary key default gen_random_uuid(),
  equipo_sn text not null references equipos(sn) on delete cascade,
  visita_numero integer not null default 1,
  descripcion text not null,
  observaciones jsonb,
  pdf_url text,
  created_at timestamptz not null default now()
);
```

### Bucket en Supabase Storage

- Crea un bucket llamado `mantenimientos`.
- Si necesitas acceso publico a los PDF, habilita lectura publica o usa signed URLs.

### API (Express)

Endpoints esperados:

- `GET /api/equipos`
- `POST /api/equipos`
- `GET /api/equipos/:sn`
- `POST /api/mantenimientos` (multipart con `pdf` opcional)

Si partes de cero, crea un `index.js` similar al de este proyecto:
`backend/index.js`.

## 2) Frontend (Next.js)

### Inicializar

```
mkdir frontend
cd frontend
npx create-next-app@latest . --ts --eslint --tailwind --app --src-dir --import-alias "@/*"
```

### Variables de entorno

Crear `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Estructura de paginas

Rutas sugeridas:

- `/` (landing)
- `/equipos` (listado)
- `/equipos/nuevo` (registro)
- `/equipos/[sn]` (detalle + historial)
- `/mantenimientos/nuevo` (formulario)

En este proyecto ya tienes implementaciones base en `frontend/src/app`.

## 3) Levantar el proyecto

En dos terminales:

```
cd backend
npm run dev
```

```
cd frontend
npm run dev
```

## Notas

- Mantener Supabase en backend permite usar `service_role` y centralizar validaciones.
- Para produccion, usa variables seguras y CORS restringido.
