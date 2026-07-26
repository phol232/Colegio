# NestJS Academic Backend

API NestJS + TypeScript por capas. Persistencia en PostgreSQL OLTP; lógica de negocio en TypeORM. Análisis en tiempo real vía Redis + Socket.IO.

## Procesos

| Proceso | Comando | Rol |
|---------|---------|-----|
| API | `pnpm run start:prod` | HTTP `/api` + WebSocket `/api/socket.io` |
| Scheduler | `pnpm run start:scheduler` | Limpieza de tokens cada hora |

## Desarrollo

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm run start:dev
```

## SQL

Esquema base desde `../Database` (requiere `pg` del backend):

```bash
pnpm install
NODE_PATH=./node_modules node ../Database/scripts/apply-sql.mjs --oltp
```

Migraciones versionadas (matrícula anual → sync estudiantes/cursos) las aplica el API
al arrancar (`migrationsRun`). Manual: `pnpm migration:run:oltp`.

## Contrato

Ver `docs/openapi-contract.yaml`.

## Tests

```bash
pnpm test
pnpm run typecheck
pnpm run build
```
