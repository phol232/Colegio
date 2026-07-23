# Despliegue del refactor de matrícula

## Migraciones (estilo git / TypeORM)

Tras `pnpm build`, al arrancar el API (`start:prod` / Docker / Railway) TypeORM aplica
automáticamente las migraciones pendientes en orden:

1. `BaselineOltp` — punto de corte
2. `MatriculaAnual` — equivalente a `Database/migrations_extra/matricula_anual.sql`
3. `SyncEstudiantesCursos` — equivalente a `Database/migrations_extra/sync_estudiantes_cursos.sql`

Quedan registradas en la tabla `typeorm_migrations` (como commits: solo se aplican una vez).

```bash
cd Backend
pnpm run build
pnpm run start:prod          # migrationsRun aplica pendientes
# o manualmente:
pnpm migration:run:oltp      # desarrollo (ts-node)
pnpm migration:run:oltp:dist # producción (tras build)
pnpm migration:show:oltp     # ver estado
```

Desactivar en worker/scheduler (ya lo hace el código) o con `TYPEORM_MIGRATIONS_RUN=false`.

## Etapa 1 — Esquema base

Base OLTP/OLAP vía `Database/docker-init` o `apply-sql.mjs` (schema + deltas).
La matrícula anual **no** va en el init SQL: la aplica el backend.

## Etapa 2 — Backend

1. Desplegar backend: al boot corre matrícula → sync.
2. Endpoints `/matricula/*` y `/admin/matriculas/*`.
3. Legacy (`POST /matricula`, `GET /matricula/opciones`) siguen como adaptadores.

## Etapa 3 — Frontend

1. Desplegar UI estudiante + hub admin `/admin/matriculas`.
2. Validar: solicitud → aprobación → cursos asignados.

## Etapa 4 — Retirada legacy (post-validación)

- Eliminar `POST /matricula` y asignación admin directa sin transacción.
- Deprecar `usuarios.grado_id/seccion_id` como fuente de verdad.
