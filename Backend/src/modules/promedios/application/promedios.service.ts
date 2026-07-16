import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GRADE_REPOSITORY,
  IGradeRepository,
} from '@/domain/ports/grade.repository.port';
import {
  EVALUATION_REPOSITORY,
  IEvaluationRepository,
} from '@/domain/ports/evaluation.repository.port';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@/domain/ports/user.repository.port';
import { GradeLiteralService } from '@/domain/services/grade-literal.service';
import { CacheService } from '@/common/redis/cache.service';
import { ok } from '@/common/dto/api-response';
import { EstudianteCursoEntity } from '@/infrastructure/typeorm/entities/oltp/estudiante-curso.entity';
import { NotaDetalleEntity } from '@/infrastructure/typeorm/entities/oltp/nota-detalle.entity';
import { OLTP_CONNECTION } from '@/infrastructure/typeorm/repositories';
import { RecalcularPromediosDto } from '../dto/recalcular-promedios.dto';

const PROMEDIO_TTL = 300;

@Injectable()
export class PromediosService {
  constructor(
    @Inject(GRADE_REPOSITORY)
    private readonly gradeRepository: IGradeRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(EVALUATION_REPOSITORY)
    private readonly evaluationRepository: IEvaluationRepository,
    private readonly gradeLiteralService: GradeLiteralService,
    private readonly cache: CacheService,
    @InjectRepository(EstudianteCursoEntity, OLTP_CONNECTION)
    private readonly estudianteCursoRepo: Repository<EstudianteCursoEntity>,
    @InjectRepository(NotaDetalleEntity, OLTP_CONNECTION)
    private readonly notaDetalleRepo: Repository<NotaDetalleEntity>,
  ) {}

  async getByEstudianteCursoUnidad(
    estudianteId: number,
    cursoId: number,
    unidad: number,
  ) {
    const cacheKey = `promedio_${estudianteId}_${cursoId}_${unidad}`;
    try {
      return await this.cache.remember(cacheKey, PROMEDIO_TTL, async () => {
        const promedio = await this.gradeRepository.findPromedio(
          estudianteId,
          cursoId,
          unidad,
        );

        if (!promedio) {
          const evaluaciones = await this.evaluationRepository.listByCourseUnit(
            cursoId,
            unidad,
          );
          const evaluacionIds = evaluaciones.map((e) => e.id);
          let totalEvaluaciones = 0;

          if (evaluacionIds.length > 0) {
            totalEvaluaciones = await this.notaDetalleRepo
              .createQueryBuilder('nd')
              .where('nd.estudiante_id = :estudianteId', { estudianteId })
              .andWhere('nd.evaluacion_id IN (:...evaluacionIds)', {
                evaluacionIds,
              })
              .getCount();
          }

          return {
            success: true,
            data: {
              estudiante_id: estudianteId,
              curso_id: cursoId,
              unidad,
              promedio_numerico: 0,
              promedio_literal: 'C',
              total_evaluaciones: totalEvaluaciones,
            },
          };
        }

        return {
          success: true,
          data: {
            estudiante_id: promedio.estudianteId,
            curso_id: promedio.cursoId,
            unidad: promedio.unidad,
            promedio_numerico: promedio.promedioNumerico,
            promedio_literal: promedio.promedioLiteral,
            total_evaluaciones: promedio.totalEvaluaciones,
          },
        };
      });
    } catch (e: unknown) {
      return {
        success: false,
        message:
          'Error al obtener promedio: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  async getByEstudianteCurso(estudianteId: number, cursoId: number) {
    try {
      const cacheKey = `promedios_estudiante_${estudianteId}_${cursoId}`;
      return await this.cache.remember(cacheKey, PROMEDIO_TTL, async () => {
        const promedios =
          await this.gradeRepository.listPromediosByEstudianteCurso(
            estudianteId,
            cursoId,
          );

        const promedioGeneral =
          promedios.length > 0
            ? promedios.reduce(
                (sum, p) => sum + Number(p.promedioNumerico),
                0,
              ) / promedios.length
            : 0;

        return ok({
          promedios_por_unidad: promedios.map((p) => ({
            id: p.id,
            estudiante_id: p.estudianteId,
            curso_id: p.cursoId,
            unidad: p.unidad,
            promedio_numerico: p.promedioNumerico,
            promedio_literal: p.promedioLiteral,
            total_evaluaciones: p.totalEvaluaciones,
            created_at: p.createdAt,
            updated_at: p.updatedAt,
          })),
          promedio_general: Math.round(promedioGeneral * 100) / 100,
          promedio_general_literal:
            this.gradeLiteralService.convertirALiteral(promedioGeneral),
          total_unidades: promedios.length,
        });
      });
    } catch (e: unknown) {
      return {
        success: false,
        message:
          'Error al obtener promedios: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  async getByCursoUnidad(cursoId: number, unidad: number) {
    try {
      const cacheKey = `promedios_curso_${cursoId}_${unidad}`;
      return await this.cache.remember(cacheKey, PROMEDIO_TTL, async () => {
        const promedios = await this.gradeRepository.listPromediosByCursoUnidad(
          cursoId,
          unidad,
        );

        const data = await Promise.all(
          promedios.map(async (p) => {
            const estudiante = await this.userRepository.findById(
              p.estudianteId,
            );
            return {
              estudiante_id: p.estudianteId,
              estudiante_nombre: estudiante?.name ?? null,
              estudiante_email: estudiante?.email ?? null,
              promedio_numerico: p.promedioNumerico,
              promedio_literal: p.promedioLiteral,
              total_evaluaciones: p.totalEvaluaciones,
              updated_at: p.updatedAt,
            };
          }),
        );

        data.sort((a, b) =>
          String(a.estudiante_nombre ?? '').localeCompare(
            String(b.estudiante_nombre ?? ''),
          ),
        );

        const resultado: Record<string, unknown> = {
          success: true,
          data,
        };

        if (data.length > 0) {
          const nums = data.map((p) => Number(p.promedio_numerico));
          const avg = nums.reduce((a, b) => a + b, 0) / nums.length;

          resultado.estadisticas = {
            total_estudiantes: data.length,
            promedio_general: Math.round(avg * 100) / 100,
            promedio_maximo: Math.max(...nums),
            promedio_minimo: Math.min(...nums),
            aprobados: nums.filter((n) => n >= 11).length,
            desaprobados: nums.filter((n) => n < 11).length,
          };
        }

        return resultado;
      });
    } catch (e: unknown) {
      return {
        success: false,
        message:
          'Error al obtener promedios: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  async recalcular(dto: RecalcularPromediosDto) {
    try {
      const count = await this.gradeRepository.recalcularPromediosCursoUnidad(
        dto.curso_id,
        dto.unidad,
      );

      await this.limpiarCachePromedios(dto.curso_id, dto.unidad);

      return {
        success: true,
        message: `Recalculados ${count} promedios`,
        count,
      };
    } catch (e: unknown) {
      return {
        success: false,
        message:
          'Error al recalcular promedios: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  async getRanking(cursoId: number, unidad: number) {
    try {
      const cacheKey = `promedios_ranking_${cursoId}_${unidad}`;
      return await this.cache.remember(cacheKey, PROMEDIO_TTL, async () => {
        const promedios = await this.gradeRepository.listPromediosByCursoUnidad(
          cursoId,
          unidad,
        );

        const ranking = await Promise.all(
          promedios.map(async (p, index) => {
            const estudiante = await this.userRepository.findById(
              p.estudianteId,
            );
            return {
              posicion: index + 1,
              estudiante_id: p.estudianteId,
              estudiante_nombre: estudiante?.name ?? null,
              promedio_numerico: Number(p.promedioNumerico),
              promedio_literal: p.promedioLiteral,
              total_evaluaciones: Number(p.totalEvaluaciones),
            };
          }),
        );

        return ok(ranking);
      });
    } catch (e: unknown) {
      return {
        success: false,
        message:
          'Error al obtener ranking: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  async getEstadisticasCurso(cursoId: number) {
    try {
      const cacheKey = `promedios_stats_${cursoId}`;
      return await this.cache.remember(cacheKey, PROMEDIO_TTL, async () => {
        const evaluaciones = await this.evaluationRepository.listByCourse(
          cursoId,
        );

        if (evaluaciones.length === 0) {
          return ok({
            total_estudiantes: 0,
            promedio_general: 0,
            estudiantes_aprobados: 0,
            estudiantes_desaprobados: 0,
            total_evaluaciones: 0,
          });
        }

        const ids = evaluaciones.map((e) => e.id);
        const notas = await this.notaDetalleRepo
          .createQueryBuilder('nd')
          .select(['nd.estudiante_id AS estudiante_id', 'nd.puntaje AS puntaje'])
          .where('nd.evaluacion_id IN (:...ids)', { ids })
          .getRawMany<{ estudiante_id: number; puntaje: number }>();

        if (notas.length === 0) {
          return ok({
            total_estudiantes: 0,
            promedio_general: 0,
            estudiantes_aprobados: 0,
            estudiantes_desaprobados: 0,
            total_evaluaciones: evaluaciones.length,
          });
        }

        const byEstudiante = new Map<number, number[]>();
        for (const n of notas) {
          const list = byEstudiante.get(Number(n.estudiante_id)) ?? [];
          list.push(Number(n.puntaje));
          byEstudiante.set(Number(n.estudiante_id), list);
        }

        const promedios: number[] = [];
        for (const scores of byEstudiante.values()) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          promedios.push(Math.round(avg * 100) / 100);
        }

        const promedioGeneral =
          Math.round(
            (promedios.reduce((a, b) => a + b, 0) / promedios.length) * 100,
          ) / 100;

        return ok({
          total_estudiantes: promedios.length,
          promedio_general: promedioGeneral,
          estudiantes_aprobados: promedios.filter((p) => p >= 11).length,
          estudiantes_desaprobados: promedios.filter((p) => p < 11).length,
          total_evaluaciones: evaluaciones.length,
        });
      });
    } catch (e: unknown) {
      throw new InternalServerErrorException({
        success: false,
        message:
          'Error al obtener estadísticas: ' +
          (e instanceof Error ? e.message : String(e)),
      });
    }
  }

  private async limpiarCachePromedios(cursoId: number, unidad: number) {
    const estudiantes = await this.estudianteCursoRepo.find({
      where: { cursoId },
      select: ['estudianteId'],
    });

    for (const { estudianteId } of estudiantes) {
      await this.cache.del(`promedio_${estudianteId}_${cursoId}_${unidad}`);
      await this.cache.del(`promedios_estudiante_${estudianteId}_${cursoId}`);
    }

    await this.cache.del(`promedios_curso_${cursoId}_${unidad}`);
    await this.cache.del(`promedios_ranking_${cursoId}_${unidad}`);
    await this.cache.del(`promedios_stats_${cursoId}`);
  }
}
