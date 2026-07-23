import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  EVALUATION_REPOSITORY,
  EvaluationRecord,
  IEvaluationRepository,
} from '@/domain/ports/evaluation.repository.port';
import { EvaluationWeightPolicyService } from '@/domain/services/evaluation-weight-policy.service';
import { ok } from '@/common/dto/api-response';
import { CrearEvaluacionDto } from '../dto/crear-evaluacion.dto';
import { ActualizarEvaluacionDto } from '../dto/actualizar-evaluacion.dto';
import { ReordenarEvaluacionesDto } from '../dto/reordenar-evaluaciones.dto';
import { mesToUnidad } from '../dto/mes-to-unidad';

function mapEvaluacion(record: EvaluationRecord) {
  return {
    id: record.id,
    curso_id: record.cursoId,
    unidad: record.unidad,
    mes: record.mes,
    nombre: record.nombre,
    tipo_evaluacion: record.tipoEvaluacion,
    peso: record.peso,
    orden: record.orden,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function resolvePeso(peso?: number | null): number | null {
  if (peso == null || Number.isNaN(Number(peso))) return null;
  return Number(peso);
}

@Injectable()
export class EvaluacionesService {
  constructor(
    @Inject(EVALUATION_REPOSITORY)
    private readonly evaluationRepo: IEvaluationRepository,
    private readonly weightPolicy: EvaluationWeightPolicyService,
  ) {}

  async crear(dto: CrearEvaluacionDto) {
    const nombre = dto.nombre.trim();
    if (!nombre) {
      return {
        success: false,
        message: 'El nombre de la evaluación no puede estar vacío',
      };
    }

    try {
      const unidad = mesToUnidad(dto.mes);
      const tipo = dto.tipo_evaluacion.trim();
      const peso = resolvePeso(dto.peso ?? null);

      if (peso == null || peso <= 0) {
        return {
          success: false,
          message: 'El peso es obligatorio y debe ser mayor a 0',
        };
      }

      await this.weightPolicy.validateForCourseUnit(
        dto.curso_id,
        unidad,
        peso,
      );

      const evaluacion = await this.evaluationRepo.create({
        cursoId: dto.curso_id,
        mes: dto.mes,
        unidad,
        nombre,
        tipoEvaluacion: tipo,
        peso,
      });

      const totalNotas = await this.evaluationRepo.countNotas(evaluacion.id);

      return {
        success: true,
        message: 'Evaluación creada exitosamente',
        data: {
          ...mapEvaluacion(evaluacion),
          total_notas: totalNotas,
        },
      };
    } catch (e) {
      if (e instanceof BadRequestException) {
        return {
          success: false,
          message: e.message,
        };
      }
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al crear evaluación. Por favor intenta nuevamente.',
      });
    }
  }

  async actualizar(id: number, dto: ActualizarEvaluacionDto) {
    const nombre =
      dto.nombre !== undefined && dto.nombre !== null
        ? dto.nombre.trim()
        : null;

    if (nombre !== null && nombre === '') {
      return {
        success: false,
        message: 'El nombre de la evaluación no puede estar vacío',
      };
    }

    try {
      const existing = await this.evaluationRepo.findById(id);
      if (!existing) {
        return {
          success: false,
          message: 'Evaluación no encontrada',
        };
      }

      const tipoFinal = (dto.tipo_evaluacion ?? existing.tipoEvaluacion).trim();
      let peso = existing.peso;
      if (dto.peso !== undefined) {
        peso = resolvePeso(dto.peso);
        if (peso == null || peso <= 0) {
          return {
            success: false,
            message: 'El peso es obligatorio y debe ser mayor a 0',
          };
        }
      }

      if (peso != null && existing.unidad != null) {
        await this.weightPolicy.validateForCourseUnit(
          existing.cursoId,
          existing.unidad,
          Number(peso),
          id,
        );
      }

      const updated = await this.evaluationRepo.update(id, {
        nombre: nombre ?? undefined,
        tipoEvaluacion: dto.tipo_evaluacion !== undefined ? tipoFinal : undefined,
        peso: dto.peso !== undefined ? peso : undefined,
      });

      return {
        success: true,
        message: 'Evaluación actualizada exitosamente',
        data: mapEvaluacion(updated),
      };
    } catch (e) {
      if (e instanceof BadRequestException) {
        return {
          success: false,
          message: e.message,
        };
      }
      throw new InternalServerErrorException({
        success: false,
        message:
          'Error al actualizar evaluación. Por favor intenta nuevamente.',
      });
    }
  }

  async eliminar(id: number, forzar = false) {
    try {
      const result = await this.evaluationRepo.delete(id, forzar);
      if (result.requiresConfirmation) {
        return {
          success: false,
          requires_confirmation: true,
          notas_count: result.notasCount,
          message: result.message,
        };
      }
      return {
        success: result.success,
        message: result.message,
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'Error al eliminar evaluación: ' + e.message,
      };
    }
  }

  async reordenar(dto: ReordenarEvaluacionesDto) {
    try {
      const first = await this.evaluationRepo.findById(dto.evaluaciones[0].id);
      if (!first) {
        return {
          success: false,
          message: 'Evaluación no encontrada',
        };
      }

      await this.evaluationRepo.reorder(
        first.cursoId,
        dto.evaluaciones.map((item) => ({
          id: item.id,
          orden: item.orden,
        })),
      );

      return {
        success: true,
        message: 'Evaluaciones reordenadas exitosamente',
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'Error al reordenar evaluaciones: ' + e.message,
      };
    }
  }

  async show(id: number) {
    try {
      const evaluacion = await this.evaluationRepo.findById(id);

      if (!evaluacion) {
        throw new NotFoundException({
          success: false,
          message: 'Evaluación no encontrada',
        });
      }

      return ok({
        ...mapEvaluacion(evaluacion),
        notas_detalle: [],
      });
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new NotFoundException({
        success: false,
        message: 'Evaluación no encontrada',
      });
    }
  }

  async getByCurso(cursoId: number) {
    try {
      const evaluaciones = await this.evaluationRepo.listByCourse(cursoId);
      return ok(
        evaluaciones.map((evaluacion) => ({
          ...mapEvaluacion(evaluacion),
          notas_detalle: [],
        })),
      );
    } catch (e: any) {
      return {
        success: false,
        message: 'Error al obtener evaluaciones: ' + e.message,
      };
    }
  }

  async getByCursoMes(cursoId: number, mes: number) {
    try {
      const evaluaciones = await this.evaluationRepo.listByCourse(cursoId, mes);
      const data = await Promise.all(
        evaluaciones.map(async (evaluacion) => ({
          ...mapEvaluacion(evaluacion),
          total_notas: await this.evaluationRepo.countNotas(evaluacion.id),
        })),
      );
      return ok(data);
    } catch (e: any) {
      return {
        success: false,
        message: 'Error al obtener evaluaciones: ' + e.message,
      };
    }
  }
}
