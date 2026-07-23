import { Inject, Injectable } from '@nestjs/common';
import {
  IMatriculaRepository,
  MATRICULA_REPOSITORY,
} from '@/domain/ports/matricula.repository.port';
import { ok } from '../../../common/dto/api-response';

@Injectable()
export class ObtenerOpcionesMatriculaUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(estudianteId?: number) {
    if (estudianteId) {
      const propuesta = await this.matriculaRepo.getPropuesta(estudianteId);
      if (!propuesta.gradoPropuesto) {
        return ok([]);
      }
      return ok([
        {
          grado: propuesta.gradoPropuesto,
          secciones: propuesta.seccionesDisponibles,
        },
      ]);
    }
    return ok([]);
  }
}
