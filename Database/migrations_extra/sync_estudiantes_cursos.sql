-- Reparación: alinear estudiantes_cursos con matrículas activas y cursos del período
-- Canónico en runtime: Backend TypeORM SyncEstudiantesCursos1735689800000
-- (este SQL es espejo / referencia manual)

UPDATE cursos c
SET periodo_academico_id = cs.periodo_academico_activo_id
FROM configuracion_sistema cs
WHERE c.periodo_academico_id IS NULL
  AND cs.periodo_academico_activo_id IS NOT NULL;

INSERT INTO estudiantes_cursos (
  estudiante_id, curso_id, matricula_id, fecha_matricula, anio_academico
)
SELECT
  m.estudiante_id,
  c.id,
  m.id,
  COALESCE(m.confirmado_at::date, CURRENT_DATE),
  p.anio
FROM matriculas m
INNER JOIN periodos_academicos p ON p.id = m.periodo_academico_id
INNER JOIN cursos c
  ON c.grado_id = m.grado_id
 AND c.seccion_id = m.seccion_id
 AND c.periodo_academico_id = m.periodo_academico_id
WHERE m.estado = 'activa'
  AND m.seccion_id IS NOT NULL
ON CONFLICT (estudiante_id, curso_id, anio_academico) DO UPDATE
SET matricula_id = EXCLUDED.matricula_id;

DELETE FROM estudiantes_cursos ec
USING matriculas m
WHERE ec.matricula_id = m.id
  AND m.estado = 'activa'
  AND m.seccion_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM cursos c
    WHERE c.id = ec.curso_id
      AND c.grado_id = m.grado_id
      AND c.seccion_id = m.seccion_id
      AND c.periodo_academico_id = m.periodo_academico_id
  );

UPDATE usuarios u
SET grado_id = NULL, seccion_id = NULL, updated_at = CURRENT_TIMESTAMP
WHERE u.role = 'estudiante'
  AND NOT EXISTS (
    SELECT 1 FROM matriculas m
    WHERE m.estudiante_id = u.id AND m.estado = 'activa'
  )
  AND (u.grado_id IS NOT NULL OR u.seccion_id IS NOT NULL);
