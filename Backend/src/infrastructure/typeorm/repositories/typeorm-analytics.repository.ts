import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  CoursePerformanceRow,
  DateRangeFilter,
  GeneralStatsRow,
  IAnalyticsRepository,
} from '@/domain/ports/analytics.repository.port';

export const OLAP_CONNECTION = 'olap';

@Injectable()
export class TypeOrmAnalyticsRepository implements IAnalyticsRepository {
  constructor(
    @InjectDataSource(OLAP_CONNECTION)
    private readonly dataSource: DataSource,
  ) {}

  async getCoursePerformance(
    cursoId: number,
    filter?: DateRangeFilter,
  ): Promise<CoursePerformanceRow | null> {
    const { clause, params } = this.buildDateClause(filter, [cursoId]);

    const rows = await this.dataSource.query(
      `SELECT
         c.nombre AS "cursoNombre",
         c.codigo AS "cursoCodigo",
         COUNT(DISTINCT f.estudiante_key)::int AS "totalEstudiantes",
         ROUND(AVG(f.promedio_notas)::numeric, 2) AS "promedioGeneral",
         ROUND(AVG(f.porcentaje_asistencia)::numeric, 2) AS "promedioAsistencia",
         COUNT(*) FILTER (WHERE f.promedio_notas >= 11)::int AS aprobados,
         COUNT(*) FILTER (WHERE f.promedio_notas < 11)::int AS desaprobados,
         ROUND(AVG(f.nota_unidad_1)::numeric, 2) AS "promedioUnidad1",
         ROUND(AVG(f.nota_unidad_2)::numeric, 2) AS "promedioUnidad2",
         ROUND(AVG(f.nota_unidad_3)::numeric, 2) AS "promedioUnidad3",
         ROUND(AVG(f.nota_unidad_4)::numeric, 2) AS "promedioUnidad4"
       FROM fact_rendimiento_estudiantil f
       JOIN dim_curso c ON f.curso_key = c.curso_key
       JOIN dim_tiempo t ON f.tiempo_key = t.tiempo_key
       WHERE c.curso_id = $1
       ${clause}
       GROUP BY c.nombre, c.codigo`,
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
  ): Promise<Record<string, unknown>[]> {
    const params: unknown[] = [estudianteId];
    let cursoFilter = '';

    if (cursoId != null) {
      params.push(cursoId);
      cursoFilter = ` AND c.curso_id = $${params.length}`;
    }

    return this.dataSource.query(
      `SELECT
         e.nombre AS estudiante_nombre,
         c.nombre AS curso_nombre,
         c.codigo AS curso_codigo,
         t.fecha,
         t.mes,
         t.anio,
         f.promedio_notas,
         f.porcentaje_asistencia,
         f.nota_unidad_1,
         f.nota_unidad_2,
         f.nota_unidad_3,
         f.nota_unidad_4,
         f.total_asistencias,
         f.total_faltas,
         f.total_tardanzas
       FROM fact_rendimiento_estudiantil f
       JOIN dim_estudiante e ON f.estudiante_key = e.estudiante_key
       JOIN dim_curso c ON f.curso_key = c.curso_key
       JOIN dim_tiempo t ON f.tiempo_key = t.tiempo_key
       WHERE e.estudiante_id = $1
       ${cursoFilter}
       ORDER BY t.fecha DESC`,
      params,
    );
  }

  async getGeneralStats(filter?: DateRangeFilter): Promise<GeneralStatsRow> {
    const { clause, params } = this.buildDateClause(filter);

    const [datos] = await this.dataSource.query(
      `SELECT
         COUNT(DISTINCT f.estudiante_key)::int AS "totalEstudiantes",
         COUNT(DISTINCT f.curso_key)::int AS "totalCursos",
         ROUND(AVG(f.promedio_notas)::numeric, 2) AS "promedioGeneral",
         ROUND(AVG(f.porcentaje_asistencia)::numeric, 2) AS "promedioAsistencia",
         COALESCE(SUM(f.total_asistencias), 0)::int AS "totalAsistenciasRegistradas",
         COALESCE(SUM(f.total_faltas), 0)::int AS "totalFaltasRegistradas",
         COUNT(*) FILTER (WHERE f.promedio_notas >= 11)::int AS "totalAprobados",
         COUNT(*) FILTER (WHERE f.promedio_notas < 11 AND f.promedio_notas > 0)::int AS "totalDesaprobados"
       FROM fact_rendimiento_estudiantil f
       JOIN dim_tiempo t ON f.tiempo_key = t.tiempo_key
       WHERE f.promedio_notas IS NOT NULL
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
    const { clause, params } = this.buildDateClause(filter);

    const [dist] = await this.dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE f.promedio_notas >= 18 AND f.promedio_notas <= 20)::int AS excelente,
         COUNT(*) FILTER (WHERE f.promedio_notas >= 15 AND f.promedio_notas < 18)::int AS bueno,
         COUNT(*) FILTER (WHERE f.promedio_notas >= 11 AND f.promedio_notas < 15)::int AS regular,
         COUNT(*) FILTER (WHERE f.promedio_notas >= 0 AND f.promedio_notas < 11)::int AS bajo
       FROM fact_rendimiento_estudiantil f
       JOIN dim_tiempo t ON f.tiempo_key = t.tiempo_key
       WHERE f.promedio_notas IS NOT NULL
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
    const { clause, params } = this.buildDateClause(filter);

    const [row] = await this.dataSource.query(
      `SELECT COUNT(DISTINCT f.curso_key)::int AS total
       FROM fact_rendimiento_estudiantil f
       JOIN dim_tiempo t ON f.tiempo_key = t.tiempo_key
       WHERE f.promedio_notas IS NOT NULL AND f.promedio_notas < 11
       ${clause}`,
      params,
    );

    return Number(row?.total ?? 0);
  }

  async getCourseRanking(
    cursoId: number,
    limit = 10,
  ): Promise<Record<string, unknown>[]> {
    return this.dataSource.query(
      `SELECT
         e.nombre AS estudiante_nombre,
         e.email AS estudiante_email,
         f.promedio_notas,
         f.porcentaje_asistencia,
         f.nota_unidad_1,
         f.nota_unidad_2,
         f.nota_unidad_3,
         f.nota_unidad_4
       FROM fact_rendimiento_estudiantil f
       JOIN dim_estudiante e ON f.estudiante_key = e.estudiante_key
       JOIN dim_curso c ON f.curso_key = c.curso_key
       WHERE c.curso_id = $1
         AND f.promedio_notas > 0
       ORDER BY f.promedio_notas DESC
       LIMIT $2`,
      [cursoId, limit],
    );
  }

  async compareCourses(
    filter?: DateRangeFilter,
  ): Promise<Record<string, unknown>[]> {
    const { clause, params } = this.buildDateClause(filter);

    return this.dataSource.query(
      `SELECT
         c.curso_id AS id,
         c.nombre,
         COUNT(DISTINCT f.estudiante_key)::int AS total_estudiantes,
         ROUND(AVG(f.promedio_notas)::numeric, 2) AS promedio,
         ROUND(AVG(f.porcentaje_asistencia)::numeric, 2) AS asistencia,
         COUNT(*) FILTER (WHERE f.promedio_notas >= 11)::int AS aprobados,
         COUNT(*) FILTER (WHERE f.promedio_notas < 11 AND f.promedio_notas > 0)::int AS desaprobados
       FROM fact_rendimiento_estudiantil f
       JOIN dim_curso c ON f.curso_key = c.curso_key
       JOIN dim_tiempo t ON f.tiempo_key = t.tiempo_key
       WHERE f.promedio_notas IS NOT NULL
       ${clause}
       GROUP BY c.curso_id, c.nombre
       ORDER BY promedio DESC NULLS LAST`,
      params,
    );
  }

  async getCourseEvolutionValues(cursoId: number): Promise<number[]> {
    const rows = await this.dataSource.query(
      `SELECT f.promedio_notas
       FROM fact_rendimiento_estudiantil f
       JOIN dim_curso c ON f.curso_key = c.curso_key
       WHERE c.curso_id = $1 AND f.promedio_notas IS NOT NULL`,
      [cursoId],
    );

    return rows.map((r: { promedio_notas: string | number }) =>
      Number(r.promedio_notas),
    );
  }

  private buildDateClause(
    filter?: DateRangeFilter,
    baseParams: unknown[] = [],
  ): { clause: string; params: unknown[] } {
    const params = [...baseParams];
    let clause = '';

    if (filter?.fechaInicio) {
      params.push(filter.fechaInicio);
      clause += ` AND t.fecha >= $${params.length}`;
    }
    if (filter?.fechaFin) {
      params.push(filter.fechaFin);
      clause += ` AND t.fecha <= $${params.length}`;
    }

    return { clause, params };
  }
}
