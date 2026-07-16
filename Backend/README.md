# NestJS Academic Backend

API NestJS + TypeScript por capas. Persistencia en PostgreSQL; lógica de negocio en TypeORM.

## Procesos

| Proceso | Comando | Rol |
|---------|---------|-----|
| API | `pnpm run start:prod` | HTTP `/api` |
| Worker | `pnpm run start:worker` | BullMQ `olap-sync` |
| Scheduler | `pnpm run start:scheduler` | Cron horario + full 03:00 |

## Desarrollo

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm run start:dev
```

## SQL

Aplicar esquema desde `../Database` (requiere `pg` del backend):

```bash
pnpm install
NODE_PATH=./node_modules node ../Database/scripts/apply-sql.mjs --oltp
NODE_PATH=./node_modules node ../Database/scripts/apply-sql.mjs --olap
```

## Contrato

Ver `docs/openapi-contract.yaml`.

## Tests

```bash
pnpm test
pnpm run typecheck
pnpm run build
```
