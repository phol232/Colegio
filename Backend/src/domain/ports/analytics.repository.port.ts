export { ANALYTICS_REPOSITORY } from './tokens';

export interface DateRangeFilter {
  fechaInicio?: string;
  fechaFin?: string;
  /** Si está definido, limita el análisis a cursos de ese docente. */
  docenteId?: number;
}

export interface CoursePerformanceRow {
  cursoNombre: string | null;
  cursoCodigo: string | null;
  totalEstudiantes: number;
  promedioGeneral: number;
  promedioAsistencia: number;
  aprobados: number;
  desaprobados: number;
  promedioUnidad1: number;
  promedioUnidad2: number;
  promedioUnidad3: number;
  promedioUnidad4: number;
}

export interface GeneralStatsRow {
  totalEstudiantes: number;
  totalCursos: number;
  promedioGeneral: number;
  promedioAsistencia: number;
  totalAsistenciasRegistradas: number;
  totalFaltasRegistradas: number;
  totalAprobados: number;
  totalDesaprobados: number;
}

export interface IAnalyticsRepository {
  getCoursePerformance(
    cursoId: number,
    filter?: DateRangeFilter,
  ): Promise<CoursePerformanceRow | null>;
  getStudentEvolution(
    estudianteId: number,
    cursoId?: number,
    docenteId?: number,
  ): Promise<Record<string, unknown>[]>;
  getGeneralStats(filter?: DateRangeFilter): Promise<GeneralStatsRow>;
  getGradeDistribution(filter?: DateRangeFilter): Promise<{
    excelente: number;
    bueno: number;
    regular: number;
    bajo: number;
  }>;
  getLowPerformanceCourseCount(filter?: DateRangeFilter): Promise<number>;
  getCourseRanking(
    cursoId: number,
    limit?: number,
    docenteId?: number,
  ): Promise<Record<string, unknown>[]>;
  compareCourses(filter?: DateRangeFilter): Promise<Record<string, unknown>[]>;
  getCourseEvolutionValues(
    cursoId: number,
    docenteId?: number,
  ): Promise<number[]>;
  isDocenteCurso(docenteId: number, cursoId: number): Promise<boolean>;
}
