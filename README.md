# Academic Management System

Sistema de gestión académica: React frontend, NestJS API (TypeScript por capas) y PostgreSQL dual (OLTP + OLAP), con Redis para caché y colas.

## Arquitectura

### Servicios Docker

| Servicio | Rol |
|----------|-----|
| `nginx` | Reverse proxy de la API |
| `frontend` | React SPA local; en producción se despliega en Vercel |
| `backend-api` | NestJS HTTP (`/api`) |
| `backend-worker` | BullMQ consumer ETL OLAP |
| `backend-scheduler` | Cron: incremental cada hora, full 03:00 |
| `postgres` | PostgreSQL 16 local; producción reutiliza el contenedor `citas-db` |
| `db-init` | Aplica esquema SQL OLTP/OLAP (una vez) |
| `pgbouncer` | Pool de conexiones (OLTP + OLAP) |
| `redis-cache` | Caché / throttle (LRU) |
| `redis-queue` | BullMQ + locks (`noeviction` + AOF) |

### Backend NestJS

Capas por módulo: `presentation` → `application` → `domain` → `infrastructure`.

La lógica de negocio vive en TypeORM (`Backend/src/`). PostgreSQL conserva solo esquema y constraints.

Contrato HTTP: [`Backend/docs/openapi-contract.yaml`](Backend/docs/openapi-contract.yaml)

## Instalación

### Requisitos

- Docker y Docker Compose
- Node.js 20+ (desarrollo local opcional)

### Pasos

1. **Clonar y configurar**

```bash
cp .env.example .env
# Editar DB_PASSWORD y demás secretos
```

2. **Levantar stack completo**

```bash
docker compose up -d --build
```

El servicio `db-init` aplica automáticamente el esquema SQL en la primera ejecución. Asegúrate de que `DB_PASSWORD` en `.env` coincida con la contraseña del volumen de Postgres (si cambiaste la clave, recrea volúmenes con `docker compose down -v`).

3. **Verificar**

```bash
curl http://localhost/api/health
```

### Producción

El frontend se despliega por separado en Vercel. El archivo
`docker-compose.prod.yml` levanta únicamente la API y sus servicios internos;
reutiliza `citas-db:5440` mediante la red externa
`plataformareservas-reservas-p5sdl3_citas-net`. No crea otro PostgreSQL y
PgBouncer y Redis no publican puertos en el host.

Antes del primer despliegue deben existir en `citas-db` el rol `academic` y las
bases `academic_oltp` y `academic_olap`. `DB_PASSWORD` debe coincidir con la
contraseña de ese rol.

```bash
cp .env.example .env
# Configurar DB_PASSWORD, APP_URL y CORS_ORIGIN con valores reales
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec nginx \
  wget -qO- http://localhost/api/health
```

En Dokploy, agrega el dominio de la API al servicio `nginx`, puerto interno
`80`, y activa HTTPS. El Compose no publica `80:80` porque Traefik ya ocupa los
puertos 80 y 443 del VPS. En Vercel, configura
`VITE_API_URL=https://api.example.com/api`.

### Desarrollo local del Backend

```bash
cd Backend
cp .env.example .env
# Ajustar hosts a localhost / puertos publicados
corepack enable
pnpm install
pnpm run start:dev          # API
pnpm run start:worker:dev   # Worker
pnpm run start:scheduler:dev
```

## API

- Prefijo: `/api`
- Auth: `Authorization: Bearer <token>`
- Roles: `docente`, `estudiante`, `padre`, `admin`
- Docs Swagger (dev): `/api/docs`

### Correcciones respecto a Laravel

- `GET /auth/me` devuelve el usuario del guard
- `GET /asistencias/estudiante?mes=` usa `get_asistencias_estudiante_por_mes`
- `GET/PUT /admin/configuracion` implementados

## CI

Workflow: [`.github/workflows/backend-ci.yml`](.github/workflows/backend-ci.yml) — typecheck, tests, build.

## Licencia

Proyecto académico / privado.
