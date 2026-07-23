import { Injectable } from '@nestjs/common';
import {
  GradoRecord,
  MatriculaTipo,
  PeriodoRecord,
  PropuestaMatricula,
  ResultadoPromocion,
} from '@/domain/ports/matricula.repository.port';
import { GradoEntity } from '@/infrastructure/typeorm/entities/oltp/grado.entity';
import { MatriculaEntity } from '@/infrastructure/typeorm/entities/oltp/matricula.entity';
import { DecisionPromocionEntity } from '@/infrastructure/typeorm/entities/oltp/decision-promocion.entity';

@Injectable()
export class MatriculaEligibilityService {
  calcularPropuesta(input: {
    periodo: PeriodoRecord | null;
    gradoIngresoId: number | null;
    matriculaAnterior: MatriculaEntity | null;
    decisionAnterior: DecisionPromocionEntity | null;
    solicitudActual: MatriculaEntity | null;
    matriculaActiva: MatriculaEntity | null;
    grados: GradoEntity[];
  }): PropuestaMatricula {
    const requisitosPendientes: string[] = [];
    const {
      periodo,
      gradoIngresoId,
      matriculaAnterior,
      decisionAnterior,
      grados,
    } = input;

    if (!periodo) {
      return this.bloqueada('No hay período académico activo', periodo, requisitosPendientes);
    }

    if (periodo.estado !== 'matricula') {
      return this.bloqueada(
        'El período de matrícula no está abierto',
        periodo,
        requisitosPendientes,
      );
    }

    if (this.isVentanaCerrada(periodo)) {
      return this.bloqueada(
        'La ventana de matrícula ha finalizado',
        periodo,
        requisitosPendientes,
      );
    }

    if (input.matriculaActiva) {
      return this.bloqueada(
        'Ya tienes una matrícula activa para este período',
        periodo,
        requisitosPendientes,
      );
    }

    if (input.solicitudActual?.estado === 'pendiente') {
      return this.bloqueada(
        'Ya tienes una solicitud pendiente de revisión',
        periodo,
        requisitosPendientes,
      );
    }

    let gradoPropuesto: GradoRecord | null = null;
    let tipoPropuesto: MatriculaTipo | null = null;

    if (!matriculaAnterior) {
      if (!gradoIngresoId) {
        requisitosPendientes.push(
          'El grado de ingreso no está configurado por administración',
        );
        return this.bloqueada(
          'No hay grado de ingreso configurado',
          periodo,
          requisitosPendientes,
        );
      }
      gradoPropuesto = this.mapGrado(
        grados.find((g) => Number(g.id) === gradoIngresoId),
      );
      tipoPropuesto = 'ingreso';
    } else if (!decisionAnterior) {
      requisitosPendientes.push(
        'Administración debe registrar tu resultado del año anterior',
      );
      return this.bloqueada(
        'Falta la decisión de promoción del año anterior',
        periodo,
        requisitosPendientes,
      );
    } else if (decisionAnterior.resultado === 'egresado') {
      return this.bloqueada(
        'Has egresado del colegio y no puedes solicitar matrícula',
        periodo,
        requisitosPendientes,
      );
    } else if (decisionAnterior.resultado === 'repite') {
      const grado = grados.find(
        (g) => Number(g.id) === Number(matriculaAnterior.gradoId),
      );
      gradoPropuesto = this.mapGrado(grado);
      tipoPropuesto = 'repeticion';
    } else if (decisionAnterior.resultado === 'promovido') {
      if (!decisionAnterior.gradoDestinoId) {
        requisitosPendientes.push('Falta definir el grado de destino');
        return this.bloqueada(
          'No hay grado de destino definido',
          periodo,
          requisitosPendientes,
        );
      }
      gradoPropuesto = this.mapGrado(
        grados.find((g) => Number(g.id) === Number(decisionAnterior.gradoDestinoId)),
      );
      tipoPropuesto = 'continuidad';
    }

    if (!gradoPropuesto) {
      return this.bloqueada(
        'No se pudo determinar el grado de destino',
        periodo,
        requisitosPendientes,
      );
    }

    return {
      puedeSolicitar: true,
      motivoBloqueo: null,
      periodo,
      gradoPropuesto,
      tipoPropuesto,
      seccionesDisponibles: [],
      requisitosPendientes,
    };
  }

  calcularGradoDestinoPromocion(
    gradoActual: GradoEntity,
    grados: GradoEntity[],
    resultado: ResultadoPromocion,
  ): number | null {
    if (resultado === 'repite') {
      return Number(gradoActual.id);
    }
    if (resultado === 'egresado') {
      return null;
    }
    const sorted = [...grados].sort((a, b) => {
      if (a.nivel !== b.nivel) {
        return a.nivel === 'primaria' ? -1 : 1;
      }
      return a.numero - b.numero;
    });
    const idx = sorted.findIndex((g) => Number(g.id) === Number(gradoActual.id));
    if (idx < 0 || idx >= sorted.length - 1) {
      return null;
    }
    return Number(sorted[idx + 1].id);
  }

  private isVentanaCerrada(periodo: PeriodoRecord): boolean {
    if (!periodo.matriculaInicio && !periodo.matriculaFin) {
      return false;
    }
    const hoy = new Date().toISOString().slice(0, 10);
    if (periodo.matriculaInicio && hoy < periodo.matriculaInicio) {
      return true;
    }
    if (periodo.matriculaFin && hoy > periodo.matriculaFin) {
      return true;
    }
    return false;
  }

  private mapGrado(grado?: GradoEntity): GradoRecord | null {
    if (!grado) return null;
    return {
      id: Number(grado.id),
      nombre: grado.nombre,
      nivel: grado.nivel,
      numero: grado.numero,
    };
  }

  private bloqueada(
    motivo: string,
    periodo: PeriodoRecord | null,
    requisitos: string[],
  ): PropuestaMatricula {
    return {
      puedeSolicitar: false,
      motivoBloqueo: motivo,
      periodo,
      gradoPropuesto: null,
      tipoPropuesto: null,
      seccionesDisponibles: [],
      requisitosPendientes: requisitos,
    };
  }
}
