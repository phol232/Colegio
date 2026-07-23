import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  IMatriculaRepository,
  MATRICULA_REPOSITORY,
} from '@/domain/ports/matricula.repository.port';
import { ok } from '../../../common/dto/api-response';
import { MatricularDto } from '../presentation/dto/matricular.dto';

@Injectable()
export class MatricularUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(estudianteId: number, _dto: MatricularDto) {
    try {
      const matricula = await this.matriculaRepo.solicitarMatricula(estudianteId);
      return ok(
        {
          grado: matricula.grado?.nombre ?? '',
          seccion: matricula.seccion?.nombre ?? '',
          cursos_asignados: 0,
        },
        'Solicitud de matrícula enviada exitosamente',
      );
    } catch (e: unknown) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Error al solicitar matrícula',
      );
    }
  }
}
