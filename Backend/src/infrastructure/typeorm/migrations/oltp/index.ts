import { BaselineOltp1735689600000 } from './1735689600000-BaselineOltp';
import { MatriculaAnual1735689700000 } from './1735689700000-MatriculaAnual';
import { SyncEstudiantesCursos1735689800000 } from './1735689800000-SyncEstudiantesCursos';

/**
 * Migraciones OLTP versionadas (estilo git): se aplican en orden de timestamp.
 * 1) Baseline
 * 2) MatriculaAnual  ← Database/migrations_extra/matricula_anual.sql
 * 3) SyncEstudiantesCursos ← Database/migrations_extra/sync_estudiantes_cursos.sql
 */
export const OLTP_MIGRATIONS = [
  BaselineOltp1735689600000,
  MatriculaAnual1735689700000,
  SyncEstudiantesCursos1735689800000,
];
