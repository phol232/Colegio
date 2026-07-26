import { BaselineOltp1735689600000 } from './1735689600000-BaselineOltp';
import { MatriculaAnual1735689700000 } from './1735689700000-MatriculaAnual';
import { SyncEstudiantesCursos1735689800000 } from './1735689800000-SyncEstudiantesCursos';
import { AnalyticsIndexes1735689900000 } from './1735689900000-AnalyticsIndexes';
import { DropOlapDatabase1735689910000 } from './1735689910000-DropOlapDatabase';

/**
 * Migraciones OLTP versionadas (estilo git): se aplican en orden de timestamp
 * al arrancar el API (migrationsRun).
 *
 * 1) Baseline
 * 2) MatriculaAnual
 * 3) SyncEstudiantesCursos
 * 4) AnalyticsIndexes  ← Database/migrations_extra/analytics_indexes.sql
 * 5) DropOlapDatabase  ← Database/scripts/drop-olap.sql
 */
export const OLTP_MIGRATIONS = [
  BaselineOltp1735689600000,
  MatriculaAnual1735689700000,
  SyncEstudiantesCursos1735689800000,
  AnalyticsIndexes1735689900000,
  DropOlapDatabase1735689910000,
];
