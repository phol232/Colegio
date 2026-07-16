import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateEvaluationInput,
  DeleteEvaluationResult,
  EvaluationRecord,
  IEvaluationRepository,
  ReorderEvaluationItem,
  UpdateEvaluationInput,
} from '@/domain/ports/evaluation.repository.port';
import { EvaluacionEntity } from '../entities/oltp/evaluacion.entity';
import { NotaDetalleEntity } from '../entities/oltp/nota-detalle.entity';
import { OLTP_CONNECTION } from './typeorm-unit-of-work';

function mapEvaluation(entity: EvaluacionEntity): EvaluationRecord {
  return {
    id: Number(entity.id),
    cursoId: Number(entity.cursoId),
    unidad: entity.unidad != null ? Number(entity.unidad) : null,
    mes: entity.mes,
    nombre: entity.nombre,
    tipoEvaluacion: entity.tipoEvaluacion,
    peso: entity.peso != null ? Number(entity.peso) : null,
    orden: entity.orden,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class TypeOrmEvaluationRepository implements IEvaluationRepository {
  constructor(
    @InjectRepository(EvaluacionEntity, OLTP_CONNECTION)
    private readonly repo: Repository<EvaluacionEntity>,
    @InjectRepository(NotaDetalleEntity, OLTP_CONNECTION)
    private readonly notaRepo: Repository<NotaDetalleEntity>,
  ) {}

  async findById(id: number): Promise<EvaluationRecord | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? mapEvaluation(entity) : null;
  }

  async listByCourse(cursoId: number, mes?: number): Promise<EvaluationRecord[]> {
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.curso_id = :cursoId', { cursoId });

    if (mes != null) {
      qb.andWhere('e.mes = :mes', { mes });
    }

    const rows = await qb
      .orderBy('e.mes', 'ASC')
      .addOrderBy('e.orden', 'ASC')
      .getMany();
    return rows.map(mapEvaluation);
  }

  async listByCourseUnit(
    cursoId: number,
    unidad: number,
  ): Promise<EvaluationRecord[]> {
    const rows = await this.repo.find({
      where: { cursoId, unidad },
      order: { orden: 'ASC' },
    });
    return rows.map(mapEvaluation);
  }

  async create(input: CreateEvaluationInput): Promise<EvaluationRecord> {
    const orden =
      input.orden ??
      (await this.getNextOrden(input.cursoId, input.mes));

    const entity = this.repo.create({
      cursoId: input.cursoId,
      mes: input.mes,
      unidad: input.unidad,
      nombre: input.nombre,
      tipoEvaluacion: input.tipoEvaluacion,
      peso: input.peso ?? null,
      orden,
    });

    const saved = await this.repo.save(entity);
    return mapEvaluation(saved);
  }

  async update(
    id: number,
    input: UpdateEvaluationInput,
  ): Promise<EvaluationRecord> {
    const entity = await this.repo.findOneOrFail({ where: { id } });

    if (input.nombre !== undefined) entity.nombre = input.nombre;
    if (input.tipoEvaluacion !== undefined) {
      entity.tipoEvaluacion = input.tipoEvaluacion;
    }
    if (input.peso !== undefined) entity.peso = input.peso;
    entity.updatedAt = new Date();

    const saved = await this.repo.save(entity);
    return mapEvaluation(saved);
  }

  async reorder(cursoId: number, items: ReorderEvaluationItem[]): Promise<void> {
    await this.repo.manager.transaction(async (manager) => {
      for (const item of items) {
        await manager.update(
          EvaluacionEntity,
          { id: item.id, cursoId },
          { orden: item.orden, updatedAt: new Date() },
        );
      }
    });
  }

  async delete(id: number, force = false): Promise<DeleteEvaluationResult> {
    const notasCount = await this.countNotas(id);

    if (notasCount > 0 && !force) {
      return {
        success: false,
        requiresConfirmation: true,
        notasCount,
        message:
          'La evaluación tiene notas registradas. Confirma la eliminación forzada.',
      };
    }

    await this.repo.delete(id);
    return { success: true, message: 'Evaluación eliminada exitosamente' };
  }

  async sumWeightsByCourseUnit(
    cursoId: number,
    unidad: number,
    excludeEvaluationId?: number,
  ): Promise<number> {
    const qb = this.repo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.peso), 0)', 'total')
      .where('e.curso_id = :cursoId', { cursoId })
      .andWhere('e.unidad = :unidad', { unidad });

    if (excludeEvaluationId != null) {
      qb.andWhere('e.id != :excludeId', { excludeId: excludeEvaluationId });
    }

    const row = await qb.getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  async countNotas(id: number): Promise<number> {
    return this.notaRepo.count({ where: { evaluacionId: id } });
  }

  async getNextOrden(cursoId: number, mes: number): Promise<number> {
    const row = await this.repo
      .createQueryBuilder('e')
      .select('MAX(e.orden)', 'max')
      .where('e.curso_id = :cursoId', { cursoId })
      .andWhere('e.mes = :mes', { mes })
      .getRawOne<{ max: number | null }>();

    return Number(row?.max ?? 0) + 1;
  }
}
