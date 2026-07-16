import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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
import { ok } from '@/common/dto/api-response';
import { CrearNotaDetalleDto } from '../dto/crear-nota-detalle.dto';
import { CrearNotasBulkDto } from '../dto/crear-notas-bulk.dto';

@Injectable()
export class NotasDetalleService {
  constructor(
    @Inject(GRADE_REPOSITORY)
    private readonly gradeRepository: IGradeRepository,
    @Inject(EVALUATION_REPOSITORY)
    private readonly evaluationRepository: IEvaluationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  private validatePuntaje(puntaje: number) {
    if (puntaje < 0 || puntaje > 20) {
      return {
        success: false,
        message: 'El puntaje debe estar entre 0 y 20',
      };
    }
    return null;
  }

  async crear(dto: CrearNotaDetalleDto) {
    const puntajeError = this.validatePuntaje(dto.puntaje);
    if (puntajeError) {
      return puntajeError;
    }

    const evaluacion = await this.evaluationRepository.findById(
      dto.evaluacion_id,
    );
    if (!evaluacion) {
      return { success: false, message: 'Evaluación no encontrada' };
    }

    const estudiante = await this.userRepository.findById(dto.estudiante_id);
    if (!estudiante || estudiante.role !== 'estudiante') {
      return { success: false, message: 'Estudiante no encontrado' };
    }

    try {
      const nota = await this.gradeRepository.createNotaDetalle({
        evaluacionId: dto.evaluacion_id,
        estudianteId: dto.estudiante_id,
        puntaje: dto.puntaje,
      });

      return {
        success: true,
        message: 'Nota registrada exitosamente',
        data: {
          id: nota.id,
          evaluacion_id: nota.evaluacionId,
          estudiante_id: nota.estudianteId,
          puntaje: nota.puntaje,
        },
      };
    } catch {
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al registrar nota. Por favor intenta nuevamente.',
      });
    }
  }

  async crearBulk(dto: CrearNotasBulkDto) {
    const seen = new Set<string>();
    for (const nota of dto.notas) {
      const key = `${nota.evaluacion_id}-${nota.estudiante_id}`;
      if (seen.has(key)) {
        return {
          success: false,
          message:
            'Hay notas duplicadas para el mismo estudiante y evaluación',
          _status: 422,
        };
      }
      seen.add(key);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<Record<string, unknown>> = [];

    for (const nota of dto.notas) {
      const puntajeError = this.validatePuntaje(nota.puntaje);
      if (puntajeError) {
        errorCount += 1;
        errors.push({
          evaluacion_id: nota.evaluacion_id,
          estudiante_id: nota.estudiante_id,
          error: puntajeError.message,
        });
        continue;
      }

      try {
        await this.gradeRepository.createNotaDetalle({
          evaluacionId: nota.evaluacion_id,
          estudianteId: nota.estudiante_id,
          puntaje: nota.puntaje,
        });
        successCount += 1;
      } catch (e: unknown) {
        errorCount += 1;
        errors.push({
          evaluacion_id: nota.evaluacion_id,
          estudiante_id: nota.estudiante_id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return {
      success: errorCount === 0,
      message: `Procesadas ${successCount} notas exitosamente, ${errorCount} errores`,
      success_count: successCount,
      error_count: errorCount,
      errors,
    };
  }

  async actualizar(id: number, puntaje: number) {
    const puntajeError = this.validatePuntaje(puntaje);
    if (puntajeError) {
      return puntajeError;
    }

    const existing = await this.gradeRepository.findNotaDetalleById(id);
    if (!existing) {
      return { success: false, message: 'Nota no encontrada' };
    }

    try {
      const nota = await this.gradeRepository.updateNotaDetalle(id, puntaje);
      return {
        success: true,
        message: 'Nota actualizada exitosamente',
        data: {
          id: nota.id,
          evaluacion_id: nota.evaluacionId,
          estudiante_id: nota.estudianteId,
          puntaje: nota.puntaje,
          updated_at: nota.updatedAt,
        },
      };
    } catch {
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al actualizar nota. Por favor intenta nuevamente.',
      });
    }
  }

  async eliminar(id: number) {
    try {
      const existing = await this.gradeRepository.findNotaDetalleById(id);
      if (!existing) {
        return { success: false, message: 'Nota no encontrada' };
      }

      await this.gradeRepository.deleteNotaDetalle(id);
      return { success: true, message: 'Nota eliminada exitosamente' };
    } catch (e: unknown) {
      return {
        success: false,
        message:
          'Error al eliminar nota: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  async show(id: number) {
    try {
      const nota = await this.gradeRepository.findNotaDetalleById(id);
      if (!nota) {
        throw new NotFoundException({
          success: false,
          message: 'Nota no encontrada',
        });
      }

      const [evaluacion, estudiante] = await Promise.all([
        this.evaluationRepository.findById(nota.evaluacionId),
        this.userRepository.findById(nota.estudianteId),
      ]);

      return ok({
        id: nota.id,
        evaluacion_id: nota.evaluacionId,
        estudiante_id: nota.estudianteId,
        puntaje: nota.puntaje,
        created_at: nota.createdAt,
        updated_at: nota.updatedAt,
        evaluacion: evaluacion
          ? {
              id: evaluacion.id,
              curso_id: evaluacion.cursoId,
              unidad: evaluacion.unidad,
              mes: evaluacion.mes,
              nombre: evaluacion.nombre,
              tipo_evaluacion: evaluacion.tipoEvaluacion,
              peso: evaluacion.peso,
              orden: evaluacion.orden,
              created_at: evaluacion.createdAt,
              updated_at: evaluacion.updatedAt,
            }
          : null,
        estudiante: estudiante
          ? {
              id: estudiante.id,
              name: estudiante.name,
              email: estudiante.email,
            }
          : null,
      });
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new NotFoundException({
        success: false,
        message: 'Nota no encontrada',
      });
    }
  }

  async getByEvaluacion(evaluacionId: number) {
    try {
      const notas =
        await this.gradeRepository.listNotasByEvaluacion(evaluacionId);

      const data = await Promise.all(
        notas.map(async (nota) => {
          const estudiante = await this.userRepository.findById(
            nota.estudianteId,
          );
          return {
            id: nota.id,
            evaluacion_id: nota.evaluacionId,
            estudiante_id: nota.estudianteId,
            estudiante_nombre: estudiante?.name ?? null,
            estudiante_email: estudiante?.email ?? null,
            puntaje: nota.puntaje,
            created_at: nota.createdAt,
            updated_at: nota.updatedAt,
          };
        }),
      );

      data.sort((a, b) =>
        String(a.estudiante_nombre ?? '').localeCompare(
          String(b.estudiante_nombre ?? ''),
        ),
      );

      return { success: true, data };
    } catch (e: unknown) {
      return {
        success: false,
        message:
          'Error al obtener notas: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  async getByEstudianteCursoUnidad(
    estudianteId: number,
    cursoId: number,
    unidad: number,
  ) {
    try {
      const evaluaciones = await this.evaluationRepository.listByCourseUnit(
        cursoId,
        unidad,
      );
      const evaluacionById = new Map(evaluaciones.map((e) => [e.id, e]));

      const notas = await this.gradeRepository.listNotasByEstudianteCurso(
        estudianteId,
        cursoId,
      );

      const data = notas
        .filter((nota) => evaluacionById.has(nota.evaluacionId))
        .map((nota) => {
          const evaluacion = evaluacionById.get(nota.evaluacionId)!;
          return {
            id: nota.id,
            evaluacion_id: evaluacion.id,
            evaluacion_nombre: evaluacion.nombre,
            evaluacion_tipo: evaluacion.tipoEvaluacion,
            evaluacion_peso: evaluacion.peso,
            puntaje: nota.puntaje,
            created_at: nota.createdAt,
            _orden: evaluacion.orden,
          };
        })
        .sort((a, b) => a._orden - b._orden)
        .map(({ _orden, ...row }) => row);

      return { success: true, data };
    } catch (e: unknown) {
      return {
        success: false,
        message:
          'Error al obtener notas: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }
}
