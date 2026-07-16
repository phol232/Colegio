import { GradeLiteralService } from '@/domain/services/grade-literal.service';
import { PromedioCalculatorService } from '@/domain/services/promedio-calculator.service';
import { AttendanceCalculatorService } from '@/domain/services/attendance-calculator.service';
import { AuthTokenService } from '@/domain/services/auth-token.service';

describe('GradeLiteralService', () => {
  const service = new GradeLiteralService();

  it('convierte escala AD/A/B/C con umbral AD>=17', () => {
    expect(service.convertirALiteral(17)).toBe('AD');
    expect(service.convertirALiteral(16.99)).toBe('A');
    expect(service.convertirALiteral(14)).toBe('A');
    expect(service.convertirALiteral(11)).toBe('B');
    expect(service.convertirALiteral(10.99)).toBe('C');
  });
});

describe('PromedioCalculatorService', () => {
  const service = new PromedioCalculatorService(new GradeLiteralService());

  it('calcula promedio simple', () => {
    expect(service.calcularPromedioSimple([10, 14, 16])).toBe(13.33);
  });

  it('usa ponderado cuando pesos suman 100', () => {
    const result = service.calcularPromedioUnidad([
      { puntaje: 20, peso: 50 },
      { puntaje: 10, peso: 50 },
    ]);
    expect(result).toBe(15);
  });

  it('usa simple cuando pesos no suman 100', () => {
    const result = service.calcularPromedioUnidad([
      { puntaje: 20, peso: 30 },
      { puntaje: 10, peso: 30 },
    ]);
    expect(result).toBe(15);
  });
});

describe('AttendanceCalculatorService', () => {
  const service = new AttendanceCalculatorService();

  it('incluye tardanzas en porcentaje de asistencia', () => {
    expect(service.calcularPorcentaje(8, 2, 10)).toBe(100);
    expect(service.calcularPorcentaje(5, 0, 10)).toBe(50);
  });

  it('construye resumen con totales', () => {
    const resumen = service.construirResumen(8, 1, 1, 10);
    expect(resumen.porcentaje).toBe(90);
    expect(resumen.ausentes).toBe(1);
  });
});

describe('AuthTokenService', () => {
  const service = new AuthTokenService();

  it('genera tokens hex de 64 caracteres', () => {
    const token = service.generateToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashea de forma determinista', () => {
    expect(service.hashToken('abc')).toBe(service.hashToken('abc'));
    expect(service.hashToken('abc')).not.toBe('abc');
  });

  it('expira en 3 horas', () => {
    const before = Date.now();
    const expires = service.getExpiresAt().getTime();
    expect(expires - before).toBeGreaterThanOrEqual(3 * 60 * 60 * 1000 - 1000);
    expect(expires - before).toBeLessThanOrEqual(3 * 60 * 60 * 1000 + 1000);
  });
});
