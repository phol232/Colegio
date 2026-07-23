import { MatriculaEligibilityService } from './matricula-eligibility.service';
import { GradoEntity } from '@/infrastructure/typeorm/entities/oltp/grado.entity';

describe('MatriculaEligibilityService', () => {
  const service = new MatriculaEligibilityService();

  const grados = [
    { id: 1, nombre: '1ro Primaria', nivel: 'primaria', numero: 1 },
    { id: 2, nombre: '2do Primaria', nivel: 'primaria', numero: 2 },
  ] as GradoEntity[];

  const periodo = {
    id: 1,
    anio: 2026,
    estado: 'matricula' as const,
    matriculaInicio: null,
    matriculaFin: null,
  };

  it('bloquea si no hay grado de ingreso para estudiante nuevo', () => {
    const result = service.calcularPropuesta({
      periodo,
      gradoIngresoId: null,
      matriculaAnterior: null,
      decisionAnterior: null,
      solicitudActual: null,
      matriculaActiva: null,
      grados,
    });
    expect(result.puedeSolicitar).toBe(false);
  });

  it('permite ingreso con grado configurado', () => {
    const result = service.calcularPropuesta({
      periodo,
      gradoIngresoId: 1,
      matriculaAnterior: null,
      decisionAnterior: null,
      solicitudActual: null,
      matriculaActiva: null,
      grados,
    });
    expect(result.puedeSolicitar).toBe(true);
    expect(result.gradoPropuesto?.id).toBe(1);
    expect(result.tipoPropuesto).toBe('ingreso');
  });

  it('bloquea egresados', () => {
    const result = service.calcularPropuesta({
      periodo,
      gradoIngresoId: 1,
      matriculaAnterior: { gradoId: 2 } as never,
      decisionAnterior: { resultado: 'egresado' } as never,
      solicitudActual: null,
      matriculaActiva: null,
      grados,
    });
    expect(result.puedeSolicitar).toBe(false);
  });
});
