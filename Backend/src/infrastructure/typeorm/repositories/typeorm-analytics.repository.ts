import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  CoursePerformanceRow,
  DateRangeFilter,
  GeneralStatsRow,
  IAnalyticsRepository,
} from '@/domain/ports/analytics.repository.port';
import { OLTP_CONNECTION } from '@/infrastructure/typeorm/repositories/typeorm-unit-of-work';

/**
 * CTE reutilizable: reproduce el hecho de rendimiento a partir de OLTP.
 * Filtros de fecha: asistencias.fecha y promedios_unidad.updated_at.
 */
const RENDIMIENTO_CTE = `
WITH base AS (
  SELECT ec.estudiante_id, ec.curso_id, c.docente_id, c.grado_id, c.seccion_id, ec.anio_academico
  FROM estudiantes_cursos ec
  JOIN cursos c ON c.id = ec.curso_id
), notas AS (
  SELECT estudiante_id, curso_id,
         AVG(promedio_numerico) AS promedio_notas,
         AVG(promedio_numerico) FILTER (WHERE unidad = 1) AS nota_unidad_1,
         AVG(promedio_numerico) FILTER (WHERE unidad = 2) AS nota_unidad_2,
         AVG(promedio_numerico) FILTER (WHERE unidad = 3) AS nota_unidad_3,
         AVG(promedio_numerico) FILTER (WHERE unidad = 4) AS nota_unidad_4,
         MAX(updated_at) AS notas_updated_at
  FROM promedios_unidad
  GROUP BY estudiante_id, curso_id
), asis AS (
  SELECT estudiante_id, curso_id,
         COUNT(*)::int AS total_clases,
         COUNT(*) FILTER (WHERE estado IN ('presente','tardanza'))::int AS total_asistencias,
         COUNT(*) FILTER (WHERE estado = 'ausente')::int AS total_faltas,
         COUNT(*) FILTER (WHERE estado = 'tardanza')::int AS total_tardanzas,
         MIN(fecha) AS primera_fecha,
         MAX(fecha) AS ultima_fecha
  FROM asistencias
  GROUP BY estudiante_id, curso_id
), rendimiento AS (
  SELECT b.*,
         n.promedio_notas, n.nota_unidad_1, n.nota_unidad_2, n.nota_unidad_3, n.nota_unidad_4,
         n.notas_updated_at,
         COALESCE(a.total_clases, 0) AS total_clases,
         COALESCE(a.total_asistencias, 0) AS total_asistencias,
         COALESCE(a.total_faltas, 0) AS total_faltas,
         COALESCE(a.total_tardanzas, 0) AS total_tardanzas,
         a.primera_fecha, a.ultima_fecha,
         CASE WHEN COALESCE(a.total_clases, 0) > 0
              THEN ROUND(a.total_asistencias::numeric * 100 / a.total_clases, 2)
              ELSE 0 END AS porcentaje_asistencia
  FROM base b
  LEFT JOIN notas n USING (estudiante_id, curso_id)
  LEFT JOIN asis a USING (estudiante_id, curso_id)
)
`;

@Injectable()
export class TypeOrmAnalyticsRepository implements IAnalyticsRepository {
  constructor(
    @InjectDataSource(OLTP_CONNECTION)
    private readonly dataSource: DataSource,
  ) {}

  async getCoursePerformance(
    cursoId: number,
    filter?: DateRangeFilter,
  ): Promise<CoursePerformanceRow | null> {
    const { clause, params } = this.buildFilterClause(filter, [cursoId]);

    const rows = await this.dataSource.query(
      `${RENDIMIENTO_CTE}
       SELECT
         cc.nombre AS "cursoNombre",
         cc.codigo AS "cursoCodigo",
         COUNT(DISTINCT r.estudiante_id)::int AS "totalEstudiantes",
         ROUND(AVG(r.promedio_notas)::numeric, 2) AS "promedioGeneral",
         ROUND(AVG(r.porcentaje_asistencia)::numeric, 2) AS "promedioAsistencia",
         COUNT(*) FILTER (WHERE r.promedio_notas >= 11)::int AS aprobados,
         COUNT(*) FILTER (WHERE r.promedio_notas < 11)::int AS desaprobados,
         ROUND(AVG(r.nota_unidad_1)::numeric, 2) AS "promedioUnidad1",
         ROUND(AVG(r.nota_unidad_2)::numeric, 2) AS "promedioUnidad2",
         ROUND(AVG(r.nota_unidad_3)::numeric, 2) AS "promedioUnidad3",
         ROUND(AVG(r.nota_unidad_4)::numeric, 2) AS "promedioUnidad4"
       FROM rendimiento r
       JOIN cursos c ON c.id = r.curso_id
       JOIN cursos_catalogo cc ON cc.id = c.curso_catalogo_id
       WHERE r.curso_id = $1
       ${clause}
       GROUP BY cc.nombre, cc.codigo`,
      params,
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      cursoNombre: row.cursoNombre ?? null,
      cursoCodigo: row.cursoCodigo ?? null,
      totalEstudiantes: Number(row.totalEstudiantes ?? 0),
      promedioGeneral: Number(row.promedioGeneral ?? 0),
      promedioAsistencia: Number(row.promedioAsistencia ?? 0),
      aprobados: Number(row.aprobados ?? 0),
      desaprobados: Number(row.desaprobados ?? 0),
      promedioUnidad1: Number(row.promedioUnidad1 ?? 0),
      promedioUnidad2: Number(row.promedioUnidad2 ?? 0),
      promedioUnidad3: Number(row.promedioUnidad3 ?? 0),
      promedioUnidad4: Number(row.promedioUnidad4 ?? 0),
    };
  }

  async getStudentEvolution(
    estudianteId: number,
    cursoId?: number,
    docenteId?: number,
  ): Promise<Record<string, unknown>[]> {
    const params: unknown[] = [estudianteId];
    let extra = '';

    if (cursoId != null) {
      params.push(cursoId);
      extra += ` AND pu.curso_id = $${params.length}`;
    }
    if (docenteId != null) {
      params.push(docenteId);
      extra += ` AND c.docente_id = $${params.length}`;
    }

    return this.dataSource.query(
      `SELECT
         u.name AS estudiante_nombre,
         cc.nombre AS curso_nombre,
         cc.codigo AS curso_codigo,
         pu.updated_at::date AS fecha,
         EXTRACT(MONTH FROM pu.updated_at)::int AS mes,
         EXTRACT(YEAR FROM pu.updated_at)::int AS anio,
         pu.unidad,
         pu.promedio_numerico AS promedio_notas,
         NULL::numeric AS porcentaje_asistencia,
         CASE WHEN pu.unidad = 1 THEN pu.promedio_numerico END AS nota_unidad_1,
         CASE WHEN pu.unidad = 2 THEN pu.promedio_numerico END AS nota_unidad_2,
         CASE WHEN pu.unidad = 3 THEN pu.promedio_numerico END AS nota_unidad_3,
         CASE WHEN pu.unidad = 4 THEN pu.promedio_numerico END AS nota_unidad_4
       FROM promedios_unidad pu
       JOIN usuarios u ON u.id = pu.estudiante_id
       JOIN cursos c ON c.id = pu.curso_id
       JOIN cursos_catalogo cc ON cc.id = c.curso_catalogo_id
       WHERE pu.estudiante_id = $1
       ${extra}
       ORDER BY pu.unidad ASC, pu.updated_at DESC`,
      params,
    );
  }

  async getGeneralStats(filter?: DateRangeFilter): Promise<GeneralStatsRow> {
    const { clause, params } = this.buildFilterClause(filter);

    const [datos] = await this.dataSource.query(
      `${RENDIMIENTO_CTE}
       SELECT
         COUNT(DISTINCT r.estudiante_id)::int AS "totalEstudiantes",
         COUNT(DISTINCT r.curso_id)::int AS "totalCursos",
         ROUND(AVG(r.promedio_notas)::numeric, 2) AS "promedioGeneral",
         ROUND(AVG(r.porcentaje_asistencia)::numeric, 2) AS "promedioAsistencia",
         COALESCE(SUM(r.total_asistencias), 0)::int AS "totalAsistenciasRegistradas",
         COALESCE(SUM(r.total_faltas), 0)::int AS "totalFaltasRegistradas",
         COUNT(*) FILTER (WHERE r.promedio_notas >= 11)::int AS "totalAprobados",
         COUNT(*) FILTER (WHERE r.promedio_notas < 11 AND r.promedio_notas > 0)::int AS "totalDesaprobados"
       FROM rendimiento r
       WHERE r.promedio_notas IS NOT NULL
       ${clause}`,
      params,
    );

    return {
      totalEstudiantes: Number(datos?.totalEstudiantes ?? 0),
      totalCursos: Number(datos?.totalCursos ?? 0),
      promedioGeneral: Number(datos?.promedioGeneral ?? 0),
      promedioAsistencia: Number(datos?.promedioAsistencia ?? 0),
      totalAsistenciasRegistradas: Number(
        datos?.totalAsistenciasRegistradas ?? 0,
      ),
      totalFaltasRegistradas: Number(datos?.totalFaltasRegistradas ?? 0),
      totalAprobados: Number(datos?.totalAprobados ?? 0),
      totalDesaprobados: Number(datos?.totalDesaprobados ?? 0),
    };
  }

  async getGradeDistribution(filter?: DateRangeFilter): Promise<{
    excelente: number;
    bueno: number;
    regular: number;
    bajo: number;
  }> {
    const { clause, params } = this.buildFilterClause(filter);

    const [dist] = await this.dataSource.query(
      `${RENDIMIENTO_CTE}
       SELECT
         COUNT(*) FILTER (WHERE r.promedio_notas >= 18 AND r.promedio_notas <= 20)::int AS excelente,
         COUNT(*) FILTER (WHERE r.promedio_notas >= 15 AND r.promedio_notas < 18)::int AS bueno,
         COUNT(*) FILTER (WHERE r.promedio_notas >= 11 AND r.promedio_notas < 15)::int AS regular,
         COUNT(*) FILTER (WHERE r.promedio_notas >= 0 AND r.promedio_notas < 11)::int AS bajo
       FROM rendimiento r
       WHERE r.promedio_notas IS NOT NULL
       ${clause}`,
      params,
    );

    return {
      excelente: Number(dist?.excelente ?? 0),
      bueno: Number(dist?.bueno ?? 0),
      regular: Number(dist?.regular ?? 0),
      bajo: Number(dist?.bajo ?? 0),
    };
  }

  async getLowPerformanceCourseCount(filter?: DateRangeFilter): Promise<number> {
    const { clause, params } = this.buildFilterClause(filter);

    const [row] = await this.dataSource.query(
      `${RENDIMIENTO_CTE}
       SELECT COUNT(DISTINCT r.curso_id)::int AS total
       FROM rendimiento r
       WHERE r.promedio_notas IS NOT NULL AND r.promedio_notas < 11
       ${clause}`,
      params,
    );

    return Number(row?.total ?? 0);
  }

  async getCourseRanking(
    cursoId: number,
    limit = 10,
    docenteId?: number,
  ): Promise<Record<string, unknown>[]> {
    const params: unknown[] = [cursoId, limit];
    let extra = '';
    if (docenteId != null) {
      params.push(docenteId);
      extra = ` AND r.docente_id = $${params.length}`;
    }

    return this.dataSource.query(
      `${RENDIMIENTO_CTE}
       SELECT
         u.name AS estudiante_nombre,
         u.email AS estudiante_email,
         r.promedio_notas,
         r.porcentaje_asistencia,
         r.nota_unidad_1,
         r.nota_unidad_2,
         r.nota_unidad_3,
         r.nota_unidad_4
       FROM rendimiento r
       JOIN usuarios u ON u.id = r.estudiante_id
       WHERE r.curso_id = $1
         AND r.promedio_notas > 0
         ${extra}
       ORDER BY r.promedio_notas DESC
       LIMIT $2`,
      params,
    );
  }

  async compareCourses(
    filter?: DateRangeFilter,
  ): Promise<Record<string, unknown>[]> {
    const { clause, params } = this.buildFilterClause(filter);

    return this.dataSource.query(
      `${RENDIMIENTO_CTE}
       SELECT
         r.curso_id AS id,
         cc.nombre,
         COUNT(DISTINCT r.estudiante_id)::int AS total_estudiantes,
         ROUND(AVG(r.promedio_notas)::numeric, 2) AS promedio,
         ROUND(AVG(r.porcentaje_asistencia)::numeric, 2) AS asistencia,
         COUNT(*) FILTER (WHERE r.promedio_notas >= 11)::int AS aprobados,
         COUNT(*) FILTER (WHERE r.promedio_notas < 11 AND r.promedio_notas > 0)::int AS desaprobados
       FROM rendimiento r
       JOIN cursos c ON c.id = r.curso_id
       JOIN cursos_catalogo cc ON cc.id = c.curso_catalogo_id
       WHERE r.promedio_notas IS NOT NULL
       ${clause}
       GROUP BY r.curso_id, cc.nombre
       ORDER BY promedio DESC NULLS LAST`,
      params,
    );
  }

  async getCourseEvolutionValues(
    cursoId: number,
    docenteId?: number,
  ): Promise<number[]> {
    const params: unknown[] = [cursoId];
    let extra = '';
    if (docenteId != null) {
      params.push(docenteId);
      extra = ` AND r.docente_id = $${params.length}`;
    }

    const rows = await this.dataSource.query(
      `${RENDIMIENTO_CTE}
       SELECT r.promedio_notas
       FROM rendimiento r
       WHERE r.curso_id = $1 AND r.promedio_notas IS NOT NULL
       ${extra}`,
      params,
    );

    return rows.map((r: { promedio_notas: string | number }) =>
      Number(r.promedio_notas),
    );
  }

  async isDocenteCurso(docenteId: number, cursoId: number): Promise<boolean> {
    const [row] = await this.dataSource.query(
      `SELECT 1 AS ok FROM cursos WHERE id = $1 AND docente_id = $2 LIMIT 1`,
      [cursoId, docenteId],
    );
    return Boolean(row);
  }

  private buildFilterClause(
    filter?: DateRangeFilter,
    baseParams: unknown[] = [],
  ): { clause: string; params: unknown[] } {
    const params = [...baseParams];
    let clause = '';

    if (filter?.docenteId != null) {
      params.push(filter.docenteId);
      clause += ` AND r.docente_id = $${params.length}`;
    }

    if (filter?.fechaInicio) {
      params.push(filter.fechaInicio);
      clause += ` AND (
        (r.ultima_fecha IS NOT NULL AND r.ultima_fecha >= $${params.length})
        OR (r.notas_updated_at IS NOT NULL AND r.notas_updated_at::date >= $${params.length})
      )`;
    }
    if (filter?.fechaFin) {
      params.push(filter.fechaFin);
      clause += ` AND (
        (r.primera_fecha IS NOT NULL AND r.primera_fecha <= $${params.length})
        OR (r.notas_updated_at IS NOT NULL AND r.notas_updated_at::date <= $${params.length})
      )`;
    }

    return { clause, params };
  }
}
