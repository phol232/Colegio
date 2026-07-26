# Academic Management System

Sistema de gestión académica: React frontend, NestJS API (TypeScript por capas) y PostgreSQL OLTP, con Redis para caché y WebSockets (Socket.IO) para análisis en tiempo real.

## Arquitectura

### Servicios Docker

| Servicio | Rol |
|----------|-----|
| `nginx` | Reverse proxy del stack local; producción usa Traefik |
| `frontend` | React SPA local; en producción se despliega en Vercel |
| `backend-api` | NestJS HTTP (`/api`) + Socket.IO (`/api/socket.io`) |
| `backend-scheduler` | Cron: limpieza de tokens expirados |
| `postgres` | PostgreSQL 16 local; producción reutiliza el contenedor `citas-db` |
| `db-init` | Aplica esquema SQL OLTP (una vez) |
| `pgbouncer` | Pool de conexiones (OLTP) |
| `redis-cache` | Caché LRU + adaptador Redis de Socket.IO |

### Backend NestJS

Capas por módulo: `presentation` → `application` → `domain` → `infrastructure`.

La lógica de negocio vive en TypeORM (`Backend/src/`). El módulo `analisis` calcula métricas directamente sobre OLTP, cachea en Redis (claves versionadas) y notifica al frontend vía WebSocket al guardar notas, asistencias o matrícula.

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

Antes del primer despliegue deben existir en `citas-db` el rol `academic` y la
base `academic_oltp`. `DB_PASSWORD` debe coincidir con la contraseña de ese rol.
La base `academic_olap` (si existe) ya no se usa; puedes ignorarla o borrarla a mano.

```bash
cp .env.example .env
# Configurar DB_PASSWORD, APP_URL y CORS_ORIGIN
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend-api \
  wget -qO- http://localhost:3000/api/health
```

En Dokploy, configura el dominio `apicolegio.optrix.cloud` sobre el servicio
`backend-api` (alias de red `academic-api`).
