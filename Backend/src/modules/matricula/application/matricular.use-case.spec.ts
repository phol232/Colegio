import { MatricularUseCase } from './matricular.use-case';
import { BadRequestException } from '@nestjs/common';

describe('MatricularUseCase', () => {
  const enrollmentRepo = {
    getEnrollmentState: jest.fn(),
    matricular: jest.fn(),
  };

  let useCase: MatricularUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new MatricularUseCase(enrollmentRepo as never);
  });

  it('rechaza si ya está matriculado', async () => {
    enrollmentRepo.getEnrollmentState.mockResolvedValueOnce({
      matriculado: true,
      gradoId: 1,
      seccionId: null,
    });
    await expect(
      useCase.execute(10, { grado_id: 1, seccion_id: 2 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('matricula y asigna cursos en transacción', async () => {
    enrollmentRepo.getEnrollmentState.mockResolvedValueOnce({
      matriculado: false,
      gradoId: null,
      seccionId: null,
    });
    enrollmentRepo.matricular.mockResolvedValueOnce({
      grado: '1ro',
      seccion: 'A',
      cursosAsignados: 2,
    });

    const result = await useCase.execute(10, { grado_id: 1, seccion_id: 2 });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      grado: '1ro',
      seccion: 'A',
      cursos_asignados: 2,
    });
  });
});
