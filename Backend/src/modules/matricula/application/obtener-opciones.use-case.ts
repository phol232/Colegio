import { Inject, Injectable } from '@nestjs/common';
import {
  ENROLLMENT_REPOSITORY,
  IEnrollmentRepository,
} from '@/domain/ports/enrollment.repository.port';
import { ok } from '../../../common/dto/api-response';

@Injectable()
export class ObtenerOpcionesMatriculaUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY)
    private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute() {
    const { grados, secciones } =
      await this.enrollmentRepo.getMatriculaOptions();

    const opciones = grados.map((grado) => ({
      grado: {
        id: grado.id,
        nombre: grado.nombre,
        numero: grado.numero,
        nivel: grado.nivel,
      },
      secciones: secciones
        .filter((seccion) => seccion.gradoId === grado.id)
        .map((seccion) => ({
          id: seccion.id,
          nombre: seccion.nombre,
          capacidad: seccion.capacidad,
        })),
    }));

    return ok(opciones);
  }
}
