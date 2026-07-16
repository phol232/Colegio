import { Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_REPOSITORY,
  IAnalyticsRepository,
} from '@/domain/ports/analytics.repository.port';
import { CacheService } from '@/common/redis/cache.service';

@Injectable()
export class AnalisisService {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analyticsRepository: IAnalyticsRepository,
    private readonly cache: CacheService,
  ) {}

  async rendimiento(
    cursoId?: number,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    if (cursoId) {
      const { rendimiento } = await this.rendimientoCurso(
        cursoId,
        fechaInicio,
        fechaFin,
      );
      return rendimiento;
    }
    return this.estadisticasGenerales(fechaInicio, fechaFin);
  }

  async rendimientoCurso(
    cursoId: number,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    const cacheKey = `analisis:curso:${cursoId}:${this.hashFechas(fechaInicio, fechaFin)}`;

    return this.cache.remember(cacheKey, 3600, async () => {
      const row = await this.analyticsRepository.getCoursePerformance(cursoId, {
        fechaInicio,
        fechaFin,
      });

      const rendimiento = row
        ? {
            curso_nombre: row.cursoNombre,
            curso_codigo: row.cursoCodigo,
            total_estudiantes: row.totalEstudiantes,
            promedio_general: row.promedioGeneral,
            promedio_asistencia: row.promedioAsistencia,
            aprobados: row.aprobados,
            desaprobados: row.desaprobados,
            promedio_unidad_1: row.promedioUnidad1,
            promedio_unidad_2: row.promedioUnidad2,
            promedio_unidad_3: row.promedioUnidad3,
            promedio_unidad_4: row.promedioUnidad4,
          }
        : {
            curso_nombre: null,
            curso_codigo: null,
            total_estudiantes: 0,
            promedio_general: 0,
            promedio_asistencia: 0,
            aprobados: 0,
            desaprobados: 0,
            promedio_unidad_1: 0,
            promedio_unidad_2: 0,
            promedio_unidad_3: 0,
            promedio_unidad_4: 0,
          };

      let estadisticas: ReturnType<AnalisisService['calcularEstadisticas']> | null =
        null;
      if (Number(rendimiento.total_estudiantes) > 0) {
        const valores = await this.analyticsRepository.getCourseEvolutionValues(
          cursoId,
        );
        const evolucion = valores.map((promedio_notas) => ({ promedio_notas }));
        estadisticas = this.calcularEstadisticas(evolucion);
      }

      return { rendimiento, estadisticas };
    });
  }

  async evolucionEstudiante(estudianteId: number, cursoId?: number) {
    const cacheKey = `analisis:estudiante:${estudianteId}:curso:${cursoId ?? 'all'}`;

    return this.cache.remember(cacheKey, 3600, async () => {
      const evolucion = await this.analyticsRepository.getStudentEvolution(
        estudianteId,
        cursoId,
      );

      return {
        evolucion,
        estadisticas: this.calcularEstadisticas(evolucion),
      };
    });
  }

  async estadisticasGenerales(fechaInicio?: string, fechaFin?: string) {
    const cacheKey = `analisis:generales:${this.hashFechas(fechaInicio, fechaFin)}`;

    return this.cache.remember(cacheKey, 1800, async () => {
      const filter = { fechaInicio, fechaFin };
      const [datos, dist, bajo] = await Promise.all([
        this.analyticsRepository.getGeneralStats(filter),
        this.analyticsRepository.getGradeDistribution(filter),
        this.analyticsRepository.getLowPerformanceCourseCount(filter),
      ]);

      return {
        total_estudiantes: datos.totalEstudiantes,
        promedio_general: datos.promedioGeneral,
        promedio_asistencia: datos.promedioAsistencia,
        cursos_con_bajo_rendimiento: bajo,
        distribucion_notas: {
          excelente: dist.excelente,
          bueno: dist.bueno,
          regular: dist.regular,
          bajo: dist.bajo,
        },
      };
    });
  }

  async rankingCurso(cursoId: number, limite = 10) {
    const cacheKey = `analisis:ranking:curso:${cursoId}:limite:${limite}`;

    return this.cache.remember(cacheKey, 3600, async () => {
      return this.analyticsRepository.getCourseRanking(cursoId, limite);
    });
  }

  async comparativaCursos(fechaInicio?: string, fechaFin?: string) {
    const cacheKey = `analisis:comparativa:${this.hashFechas(fechaInicio, fechaFin)}`;

    return this.cache.remember(cacheKey, 3600, async () => {
      const resultados = await this.analyticsRepository.compareCourses({
        fechaInicio,
        fechaFin,
      });

      return resultados.map((curso) => {
        const promedio = Number(curso.promedio ?? 0);
        let tendencia: 'up' | 'down' | 'stable' = 'stable';
        if (promedio >= 15) tendencia = 'up';
        else if (promedio < 11) tendencia = 'down';

        return {
          id: curso.id,
          nombre: curso.nombre,
          total_estudiantes: Number(curso.total_estudiantes ?? 0),
          promedio,
          asistencia: Number(curso.asistencia ?? 0),
          aprobados: Number(curso.aprobados ?? 0),
          desaprobados: Number(curso.desaprobados ?? 0),
          tendencia,
        };
      });
    });
  }

  calcularEstadisticas(
    datos: Array<Record<string, any>>,
    campo = 'promedio_notas',
  ) {
    const valores = datos
      .map((d) => Number(d[campo]))
      .filter((v) => !Number.isNaN(v) && v > 0)
      .sort((a, b) => a - b);

    if (valores.length === 0) {
      return {
        promedio: 0,
        mediana: 0,
        desviacion_estandar: 0,
        minimo: 0,
        maximo: 0,
        total: 0,
      };
    }

    const count = valores.length;
    const promedio = valores.reduce((a, b) => a + b, 0) / count;
    const middle = Math.floor(count / 2);
    const mediana =
      count % 2 === 0
        ? (valores[middle - 1] + valores[middle]) / 2
        : valores[middle];
    const varianza =
      valores.reduce((acc, v) => acc + (v - promedio) ** 2, 0) / count;

    return {
      promedio: Math.round(promedio * 100) / 100,
      mediana: Math.round(mediana * 100) / 100,
      desviacion_estandar: Math.round(Math.sqrt(varianza) * 100) / 100,
      minimo: Math.round(Math.min(...valores) * 100) / 100,
      maximo: Math.round(Math.max(...valores) * 100) / 100,
      total: count,
    };
  }

  private hashFechas(fechaInicio?: string, fechaFin?: string) {
    return `${fechaInicio ?? ''}:${fechaFin ?? ''}`;
  }
}
