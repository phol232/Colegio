import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  BulkNotaDetalleInput,
  CreateNotaDetalleInput,
  IGradeRepository,
  NotaDetalleRecord,
  NotaLegacyRecord,
  PromedioUnidadRecord,
} from '@/domain/ports/grade.repository.port';
import { PromedioCalculatorService } from '@/domain/services/promedio-calculator.service';
import { RENDIMIENTO_CURSO_CAMBIADO } from '@/modules/etl/rendimiento.events';
import { EvaluacionEntity } from '../entities/oltp/evaluacion.entity';
import { EstudianteCursoEntity } from '../entities/oltp/estudiante-curso.entity';
import { NotaDetalleEntity } from '../entities/oltp/nota-detalle.entity';
import { NotaLegacyEntity } from '../entities/oltp/nota-legacy.entity';
import { PromedioUnidadEntity } from '../entities/oltp/promedio-unidad.entity';
import { OLTP_CONNECTION } from './typeorm-unit-of-work';

function mapNotaDetalle(entity: NotaDetalleEntity): NotaDetalleRecord {
  return {
    id: Number(entity.id),
    evaluacionId: Number(entity.evaluacionId),
    estudianteId: Number(entity.estudianteId),
    puntaje: Number(entity.puntaje),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapPromedio(entity: PromedioUnidadEntity): PromedioUnidadRecord {
  return {
    id: Number(entity.id),
    estudianteId: Number(entity.estudianteId),
    cursoId: Number(entity.cursoId),
    unidad: entity.unidad,
    promedioNumerico: Number(entity.promedioNumerico),
    promedioLiteral: entity.promedioLiteral,
    totalEvaluaciones: entity.totalEvaluaciones,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapNotaLegacy(entity: NotaLegacyEntity): NotaLegacyRecord {
  return {
    id: Number(entity.id),
    estudianteId: Number(entity.estudianteId),
    cursoId: Number(entity.cursoId),
    unidad: entity.unidad,
    puntaje: Number(entity.puntaje),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class TypeOrmGradeRepository implements IGradeRepository {
  constructor(
    @InjectRepository(NotaDetalleEntity, OLTP_CONNECTION)
    private readonly notaDetalleRepo: Repository<NotaDetalleEntity>,
    @InjectRepository(PromedioUnidadEntity, OLTP_CONNECTION)
    private readonly promedioRepo: Repository<PromedioUnidadEntity>,
    @InjectRepository(NotaLegacyEntity, OLTP_CONNECTION)
    private readonly notaLegacyRepo: Repository<NotaLegacyEntity>,
    @InjectRepository(EvaluacionEntity, OLTP_CONNECTION)
    private readonly evaluacionRepo: Repository<EvaluacionEntity>,
    @InjectRepository(EstudianteCursoEntity, OLTP_CONNECTION)
    private readonly estudianteCursoRepo: Repository<EstudianteCursoEntity>,
    private readonly promedioCalculator: PromedioCalculatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findNotaDetalleById(id: number): Promise<NotaDetalleRecord | null> {
    const entity = await this.notaDetalleRepo.findOne({ where: { id } });
    return entity ? mapNotaDetalle(entity) : null;
  }

  async createNotaDetalle(
    input: CreateNotaDetalleInput,
  ): Promise<NotaDetalleRecord> {
    const existing = await this.notaDetalleRepo.findOne({
      where: {
        evaluacionId: input.evaluacionId,
        estudianteId: input.estudianteId,
      },
    });

    const entity = existing
      ? await this.notaDetalleRepo.save({
          ...existing,
          puntaje: input.puntaje,
          updatedAt: new Date(),
        })
      : await this.notaDetalleRepo.save({
          evaluacionId: input.evaluacionId,
          estudianteId: input.estudianteId,
          puntaje: input.puntaje,
        });

    const cursoId = await this.recalcularPromedioFromNota(entity);
    if (cursoId != null) {
      this.emitCursoCambiado(cursoId);
    }
    return mapNotaDetalle(entity);
  }

  async createNotasDetalleBulk(
    notas: BulkNotaDetalleInput[],
  ): Promise<{ success: boolean; inserted: number }> {
    let inserted = 0;
    const cursoIds = new Set<number>();

    await this.notaDetalleRepo.manager.transaction(async (manager) => {
      for (const nota of notas) {
        const existing = await manager.findOne(NotaDetalleEntity, {
          where: {
            evaluacionId: nota.evaluacionId,
            estudianteId: nota.estudianteId,
          },
        });

        if (existing) {
          existing.puntaje = nota.puntaje;
          existing.updatedAt = new Date();
          await manager.save(NotaDetalleEntity, existing);
        } else {
          await manager.save(NotaDetalleEntity, nota);
          inserted += 1;
        }

        const saved = await manager.findOneOrFail(NotaDetalleEntity, {
          where: {
            evaluacionId: nota.evaluacionId,
            estudianteId: nota.estudianteId,
          },
        });
        const cursoId = await this.recalcularPromedioFromNota(saved, manager);
        if (cursoId != null) {
          cursoIds.add(cursoId);
        }
      }
    });

    for (const cursoId of cursoIds) {
      this.emitCursoCambiado(cursoId);
    }

    return { success: true, inserted };
  }

  async updateNotaDetalle(
    id: number,
    puntaje: number,
  ): Promise<NotaDetalleRecord> {
    const entity = await this.notaDetalleRepo.findOneOrFail({ where: { id } });
    entity.puntaje = puntaje;
    entity.updatedAt = new Date();
    const saved = await this.notaDetalleRepo.save(entity);
    const cursoId = await this.recalcularPromedioFromNota(saved);
    if (cursoId != null) {
      this.emitCursoCambiado(cursoId);
    }
    return mapNotaDetalle(saved);
  }

  async deleteNotaDetalle(id: number): Promise<void> {
    const entity = await this.notaDetalleRepo.findOne({ where: { id } });
    if (!entity) {
      return;
    }

    await this.notaDetalleRepo.delete(id);
    const cursoId = await this.recalcularPromedioFromNota(entity);
    if (cursoId != null) {
      this.emitCursoCambiado(cursoId);
    }
  }

  async listNotasByEvaluacion(
    evaluacionId: number,
  ): Promise<NotaDetalleRecord[]> {
    const rows = await this.notaDetalleRepo.find({ where: { evaluacionId } });
    return rows.map(mapNotaDetalle);
  }

  async listNotasByEstudianteCurso(
    estudianteId: number,
    cursoId: number,
  ): Promise<NotaDetalleRecord[]> {
    const rows = await this.notaDetalleRepo
      .createQueryBuilder('nd')
      .innerJoin(EvaluacionEntity, 'e', 'e.id = nd.evaluacion_id')
      .where('nd.estudiante_id = :estudianteId', { estudianteId })
      .andWhere('e.curso_id = :cursoId', { cursoId })
      .getMany();

    return rows.map(mapNotaDetalle);
  }

  async findPromedio(
    estudianteId: number,
    cursoId: number,
    unidad: number,
  ): Promise<PromedioUnidadRecord | null> {
    const entity = await this.promedioRepo.findOne({
      where: { estudianteId, cursoId, unidad },
    });
    return entity ? mapPromedio(entity) : null;
  }

  async listPromediosByEstudianteCurso(
    estudianteId: number,
    cursoId: number,
  ): Promise<PromedioUnidadRecord[]> {
    const rows = await this.promedioRepo.find({
      where: { estudianteId, cursoId },
      order: { unidad: 'ASC' },
    });
    return rows.map(mapPromedio);
  }

  async listPromediosByCursoUnidad(
    cursoId: number,
    unidad: number,
  ): Promise<PromedioUnidadRecord[]> {
    const rows = await this.promedioRepo.find({
      where: { cursoId, unidad },
      order: { promedioNumerico: 'DESC' },
    });
    return rows.map(mapPromedio);
  }

  async recalcularPromediosCursoUnidad(
    cursoId: number,
    unidad: number,
  ): Promise<number> {
    const estudiantes = await this.estudianteCursoRepo.find({
      where: { cursoId },
      select: ['estudianteId'],
    });

    await this.promedioRepo.manager.transaction(async (manager) => {
      for (const { estudianteId } of estudiantes) {
        await this.promedioCalculator.recalcularYGuardar(
          manager,
          Number(estudianteId),
          cursoId,
          unidad,
        );
      }
    });

    this.emitCursoCambiado(cursoId);
    return estudiantes.length;
  }

  async findNotaLegacyById(id: number): Promise<NotaLegacyRecord | null> {
    const entity = await this.notaLegacyRepo.findOne({ where: { id } });
    return entity ? mapNotaLegacy(entity) : null;
  }

  async createNotaLegacy(
    estudianteId: number,
    cursoId: number,
    unidad: number,
    puntaje: number,
  ): Promise<NotaLegacyRecord> {
    const entity = await this.notaLegacyRepo.save({
      estudianteId,
      cursoId,
      unidad,
      puntaje,
    });
    this.emitCursoCambiado(cursoId);
    return mapNotaLegacy(entity);
  }

  async updateNotaLegacy(
    id: number,
    puntaje: number,
  ): Promise<NotaLegacyRecord> {
    await this.notaLegacyRepo.update(id, {
      puntaje,
      updatedAt: new Date(),
    });
    const entity = await this.notaLegacyRepo.findOneOrFail({ where: { id } });
    this.emitCursoCambiado(Number(entity.cursoId));
    return mapNotaLegacy(entity);
  }

  async deleteNotaLegacy(id: number): Promise<void> {
    const entity = await this.notaLegacyRepo.findOne({ where: { id } });
    await this.notaLegacyRepo.delete(id);
    if (entity) {
      this.emitCursoCambiado(Number(entity.cursoId));
    }
  }

  async listNotasLegacy(filters: {
    estudianteId?: number;
    cursoId?: number;
    unidad?: number;
  }): Promise<NotaLegacyRecord[]> {
    const where: Partial<NotaLegacyEntity> = {};
    if (filters.estudianteId != null) where.estudianteId = filters.estudianteId;
    if (filters.cursoId != null) where.cursoId = filters.cursoId;
    if (filters.unidad != null) where.unidad = filters.unidad;

    const rows = await this.notaLegacyRepo.find({ where });
    return rows.map(mapNotaLegacy);
  }

  private emitCursoCambiado(cursoId: number) {
    this.eventEmitter.emit(RENDIMIENTO_CURSO_CAMBIADO, { cursoId });
  }

  private async recalcularPromedioFromNota(
    nota: NotaDetalleEntity,
    manager: EntityManager = this.notaDetalleRepo.manager,
  ): Promise<number | null> {
    const evaluacion = await manager.findOne(EvaluacionEntity, {
      where: { id: nota.evaluacionId },
    });
    if (!evaluacion?.unidad) {
      return evaluacion?.cursoId != null ? Number(evaluacion.cursoId) : null;
    }

    await this.promedioCalculator.recalcularYGuardar(
      manager,
      Number(nota.estudianteId),
      Number(evaluacion.cursoId),
      evaluacion.unidad,
    );
    return Number(evaluacion.cursoId);
  }
}
