import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ENROLLMENT_REPOSITORY,
  IEnrollmentRepository,
} from '@/domain/ports/enrollment.repository.port';
import { ok } from '../../../common/dto/api-response';
import { MatricularDto } from '../presentation/dto/matricular.dto';

@Injectable()
export class MatricularUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY)
    private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(estudianteId: number, dto: MatricularDto) {
    const state = await this.enrollmentRepo.getEnrollmentState(estudianteId);

    if (state.gradoId != null || state.seccionId != null) {
      throw new BadRequestException(
        'Ya estás matriculado en un grado y sección',
      );
    }

    try {
      const result = await this.enrollmentRepo.matricular(
        estudianteId,
        dto.grado_id,
        dto.seccion_id,
      );

      return ok(
        {
          grado: result.grado,
          seccion: result.seccion,
          cursos_asignados: result.cursosAsignados,
        },
        'Matrícula realizada exitosamente',
      );
    } catch {
      throw new BadRequestException('Grado o sección no válidos');
    }
  }
}
