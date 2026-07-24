import {
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import Redis from 'ioredis';
import {
  ANALYTICS_REPOSITORY,
  IAnalyticsRepository,
} from '@/domain/ports/analytics.repository.port';
import { CacheService } from '@/common/redis/cache.service';
import { CACHE_REDIS } from '@/common/redis/redis.module';
import { AuthUser } from '@/common/guards/auth-token.guard';

const ANALISIS_CACHE_TTL = 120;
const ANALISIS_VERSION_KEY = 'analisis:version';

@Injectable()
export class AnalisisService {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analyticsRepository: IAnalyticsRepository,
    private readonly cache: CacheService,
    @Inject(CACHE_REDIS) private readonly redis: Redis,
  ) {}

  async getVersion(): Promise<{ version: number }> {
    const raw = await this.redis.get(ANALISIS_VERSION_KEY);
    return { version: Number(raw ?? 0) };
  }

  /** Admin ve todo; docente solo sus cursos. */
  private scopeDocenteId(user: AuthUser): number | undefined {
    return user.role === 'docente' ? Number(user.usuario_id) : undefined;
  }

  private scopeCacheSuffix(docenteId?: number) {
    return docenteId != null ? `docente:${docenteId}` : 'all';
  }

  private async assertCursoAccess(user: AuthUser, cursoId: number) {
    if (user.role !== 'docente') return;
    const ok = await this.analyticsRepository.isDocenteCurso(
      Number(user.usuario_id),
      cursoId,
    );
    if (!ok) {
      throw new ForbiddenException({
        success: false,
        message: 'No tienes acceso a este curso',
      });
    }
  }

  async rendimiento(
    user: AuthUser,
    cursoId?: number,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    if (cursoId) {
      const { rendimiento } = await this.rendimientoCurso(
        user,
        cursoId,
        fechaInicio,
        fechaFin,
      );
      return rendimiento;
    }
    return this.estadisticasGenerales(user, fechaInicio, fechaFin);
  }

  async rendimientoCurso(
    user: AuthUser,
    cursoId: number,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    await this.assertCursoAccess(user, cursoId);
    const docenteId = this.scopeDocenteId(user);
    const cacheKey = `analisis:curso:${cursoId}:${this.scopeCacheSuffix(docenteId)}:${this.hashFechas(fechaInicio, fechaFin)}`;

    return this.cache.remember(cacheKey, ANALISIS_CACHE_TTL, async () => {
      const row = await this.analyticsRepository.getCoursePerformance(cursoId, {
        fechaInicio,
        fechaFin,
        docenteId,
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
          docenteId,
        );
        const evolucion = valores.map((promedio_notas) => ({ promedio_notas }));
        estadisticas = this.calcularEstadisticas(evolucion);
      }

      return { rendimiento, estadisticas };
    });
  }

  async evolucionEstudiante(
    user: AuthUser,
    estudianteId: number,
    cursoId?: number,
  ) {
    if (cursoId != null) {
      await this.assertCursoAccess(user, cursoId);
    }
    const docenteId = this.scopeDocenteId(user);
    const cacheKey = `analisis:estudiante:${estudianteId}:curso:${cursoId ?? 'all'}:${this.scopeCacheSuffix(docenteId)}`;

    return this.cache.remember(cacheKey, ANALISIS_CACHE_TTL, async () => {
      const evolucion = await this.analyticsRepository.getStudentEvolution(
        estudianteId,
        cursoId,
        docenteId,
      );

      return {
        evolucion,
        estadisticas: this.calcularEstadisticas(evolucion),
      };
    });
  }

  async estadisticasGenerales(
    user: AuthUser,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    const docenteId = this.scopeDocenteId(user);
    const cacheKey = `analisis:generales:${this.scopeCacheSuffix(docenteId)}:${this.hashFechas(fechaInicio, fechaFin)}`;

    return this.cache.remember(cacheKey, ANALISIS_CACHE_TTL, async () => {
      const filter = { fechaInicio, fechaFin, docenteId };
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

  async rankingCurso(user: AuthUser, cursoId: number, limite = 10) {
    await this.assertCursoAccess(user, cursoId);
    const docenteId = this.scopeDocenteId(user);
    const cacheKey = `analisis:ranking:curso:${cursoId}:limite:${limite}:${this.scopeCacheSuffix(docenteId)}`;

    return this.cache.remember(cacheKey, ANALISIS_CACHE_TTL, async () => {
      return this.analyticsRepository.getCourseRanking(
        cursoId,
        limite,
        docenteId,
      );
    });
  }

  async comparativaCursos(
    user: AuthUser,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    const docenteId = this.scopeDocenteId(user);
    const cacheKey = `analisis:comparativa:${this.scopeCacheSuffix(docenteId)}:${this.hashFechas(fechaInicio, fechaFin)}`;

    return this.cache.remember(cacheKey, ANALISIS_CACHE_TTL, async () => {
      const resultados = await this.analyticsRepository.compareCourses({
        fechaInicio,
        fechaFin,
        docenteId,
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
