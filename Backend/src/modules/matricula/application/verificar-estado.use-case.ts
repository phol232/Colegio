import { Inject, Injectable } from '@nestjs/common';
import {
  ENROLLMENT_REPOSITORY,
  IEnrollmentRepository,
} from '@/domain/ports/enrollment.repository.port';

@Injectable()
export class VerificarEstadoMatriculaUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY)
    private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(estudianteId: number) {
    const state = await this.enrollmentRepo.getEnrollmentState(estudianteId);

    return {
      success: true as const,
      matriculado: state.matriculado,
      info:
        state.matriculado && state.gradoNombre
          ? {
              grado: state.gradoNombre,
              seccion: state.seccionNombre ?? '',
            }
          : null,
    };
  }
}
