import { Injectable } from '@nestjs/common';

export interface AttendanceSummary {
  total_clases: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  porcentaje: number;
}

@Injectable()
export class AttendanceCalculatorService {
  calcularPorcentaje(
    presentes: number,
    tardanzas: number,
    total: number,
  ): number {
    if (total <= 0) {
      return 0;
    }
    return Math.round(((presentes + tardanzas) / total) * 10000) / 100;
  }

  construirResumen(
    presentes: number,
    ausentes: number,
    tardanzas: number,
    totalClases?: number,
  ): AttendanceSummary {
    const total = presentes + ausentes + tardanzas;
    return {
      total_clases: totalClases ?? total,
      presentes,
      ausentes,
      tardanzas,
      porcentaje: this.calcularPorcentaje(presentes, tardanzas, total),
    };
  }
}
