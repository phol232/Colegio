-- Índices para consultas de análisis sobre OLTP (idempotente).
-- Fuente de verdad operativa: Backend TypeORM
--   migrations/oltp/1735689900000-AnalyticsIndexes.ts
-- Se aplica al arrancar el API (migrationsRun). Este archivo queda como referencia.

CREATE INDEX IF NOT EXISTS idx_asistencias_curso_estudiante_fecha
  ON asistencias (curso_id, estudiante_id, fecha);

CREATE INDEX IF NOT EXISTS idx_promedios_curso_estudiante_unidad
  ON promedios_unidad (curso_id, estudiante_id, unidad);

CREATE INDEX IF NOT EXISTS idx_est_cursos_curso ON estudiantes_cursos (curso_id);
CREATE INDEX IF NOT EXISTS idx_est_cursos_estudiante ON estudiantes_cursos (estudiante_id);
CREATE INDEX IF NOT EXISTS idx_cursos_docente ON cursos (docente_id);
CREATE INDEX IF NOT EXISTS idx_promedios_curso_unidad ON promedios_unidad (curso_id, unidad);
CREATE INDEX IF NOT EXISTS idx_promedios_estudiante ON promedios_unidad (estudiante_id);
