import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { GradeLiteralService } from './grade-literal.service';
import { PromedioUnidadEntity } from '@/infrastructure/typeorm/entities/oltp/promedio-unidad.entity';
import { EvaluacionEntity } from '@/infrastructure/typeorm/entities/oltp/evaluacion.entity';
import { NotaDetalleEntity } from '@/infrastructure/typeorm/entities/oltp/nota-detalle.entity';

export interface NotaPonderada {
  puntaje: number;
  peso: number | null;
}

@Injectable()
export class PromedioCalculatorService {
  constructor(private readonly gradeLiteralService: GradeLiteralService) {}

  calcularPromedioSimple(notas: number[]): number {
    if (notas.length === 0) {
      return 0;
    }
    const sum = notas.reduce((acc, n) => acc + n, 0);
    return Math.round((sum / notas.length) * 100) / 100;
  }

  calcularPromedioPonderado(notas: NotaPonderada[]): number {
    const weighted = notas.filter((n) => n.peso != null && Number(n.peso) > 0);
    if (weighted.length === 0) {
      return this.calcularPromedioSimple(notas.map((n) => n.puntaje));
    }

    const totalPeso = weighted.reduce((acc, n) => acc + Number(n.peso), 0);
    if (totalPeso <= 0) {
      return this.calcularPromedioSimple(notas.map((n) => n.puntaje));
    }

    const sum = weighted.reduce(
      (acc, n) => acc + n.puntaje * Number(n.peso),
      0,
    );
    return Math.round((sum / totalPeso) * 100) / 100;
  }

  calcularPromedioUnidad(notas: NotaPonderada[]): number {
    const conPeso = notas.some((n) => n.peso != null && Number(n.peso) > 0);
    if (conPeso) {
      return this.calcularPromedioPonderado(notas);
    }
    return this.calcularPromedioSimple(notas.map((n) => n.puntaje));
  }

  async recalcularYGuardar(
    manager: EntityManager,
    estudianteId: number,
    cursoId: number,
    unidad: number,
  ): Promise<PromedioUnidadEntity> {
    const evaluaciones = await manager.find(EvaluacionEntity, {
      where: { cursoId, unidad },
    });

    if (evaluaciones.length === 0) {
      await manager.delete(PromedioUnidadEntity, {
        estudianteId,
        cursoId,
        unidad,
      });
      return manager.create(PromedioUnidadEntity, {
        estudianteId,
        cursoId,
        unidad,
        promedioNumerico: 0,
        promedioLiteral: 'C',
        totalEvaluaciones: 0,
      });
    }

    const evaluacionIds = evaluaciones.map((e) => e.id);
    const notas = await manager
      .createQueryBuilder(NotaDetalleEntity, 'nd')
      .where('nd.estudiante_id = :estudianteId', { estudianteId })
      .andWhere('nd.evaluacion_id IN (:...evaluacionIds)', { evaluacionIds })
      .getMany();

    const pesoByEvaluacion = new Map(
      evaluaciones.map((e) => [e.id, e.peso]),
    );

    const notasPonderadas: NotaPonderada[] = notas.map((n) => ({
      puntaje: Number(n.puntaje),
      peso: pesoByEvaluacion.get(n.evaluacionId) ?? null,
    }));

    const promedioNumerico = this.calcularPromedioUnidad(notasPonderadas);
    const promedioLiteral =
      this.gradeLiteralService.convertirALiteral(promedioNumerico);

    let registro = await manager.findOne(PromedioUnidadEntity, {
      where: { estudianteId, cursoId, unidad },
    });

    if (registro) {
      registro.promedioNumerico = promedioNumerico;
      registro.promedioLiteral = promedioLiteral;
      registro.totalEvaluaciones = notas.length;
      registro.updatedAt = new Date();
    } else {
      registro = manager.create(PromedioUnidadEntity, {
        estudianteId,
        cursoId,
        unidad,
        promedioNumerico,
        promedioLiteral,
        totalEvaluaciones: notas.length,
      });
    }

    return manager.save(PromedioUnidadEntity, registro);
  }
}
