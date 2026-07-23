import { MatricularUseCase } from './matricular.use-case';
import { BadRequestException } from '@nestjs/common';

describe('MatricularUseCase', () => {
  const matriculaRepo = {
    solicitarMatricula: jest.fn(),
  };

  let useCase: MatricularUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new MatricularUseCase(matriculaRepo as never);
  });

  it('rechaza si solicitarMatricula falla', async () => {
    matriculaRepo.solicitarMatricula.mockRejectedValueOnce(
      new Error('No puedes solicitar matrícula'),
    );
    await expect(
      useCase.execute(10, { grado_id: 1, seccion_id: 2 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crea solicitud de matrícula', async () => {
    matriculaRepo.solicitarMatricula.mockResolvedValueOnce({
      id: 1,
      grado: { nombre: '1ro' },
      seccion: null,
    });

    const result = await useCase.execute(10, { grado_id: 1, seccion_id: 2 });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      grado: '1ro',
      seccion: '',
      cursos_asignados: 0,
    });
  });
});
