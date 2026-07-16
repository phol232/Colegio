# Funciones PL/pgSQL históricas (fuera del flujo de despliegue)

La lógica de negocio migró a TypeORM en `Backend/src/`.

Los scripts originales permanecen en el repositorio solo como referencia:

- `Database/auth_functions.sql`
- `Database/grado_seccion_functions.sql`
- `Database/curso_catalogo_functions.sql`
- `Database/estudiante_seccion_functions.sql`
- `Database/asistencia_functions.sql`
- `Database/nota_functions.sql`
- `Database/migrations_extra/evaluacion_functions.sql`
- `Database/migrations_extra/dashboard_functions.sql`

**No aplicar** estos archivos en entornos nuevos. Usar `Database/apply-all.sql` (solo esquema).
