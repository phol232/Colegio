import { Injectable } from '@nestjs/common';
import {
  EnrollmentState,
  IEnrollmentRepository,
  MatriculaOptions,
  MatriculaResult,
} from '@/domain/ports/enrollment.repository.port';
import { IMatriculaRepository } from '@/domain/ports/matricula.repository.port';
import { Inject } from '@nestjs/common';
import { MATRICULA_REPOSITORY } from '@/domain/ports/tokens';

/**
 * Adaptador legacy: delega al repositorio de matrícula anual.
 * @deprecated Usar IMatriculaRepository directamente.
 */
@Injectable()
export class TypeOrmEnrollmentRepository implements IEnrollmentRepository {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async getMatriculaOptions(): Promise<MatriculaOptions> {
    return { grados: [], secciones: [] };
  }

  async getEnrollmentState(estudianteId: number): Promise<EnrollmentState> {
    return this.matriculaRepo.getEnrollmentState(estudianteId);
  }

  async matricular(
    estudianteId: number,
    _gradoId: number,
    _seccionId: number,
  ): Promise<MatriculaResult> {
    const solicitud = await this.matriculaRepo.solicitarMatricula(estudianteId);
    return {
      grado: solicitud.grado?.nombre ?? '',
      seccion: solicitud.seccion?.nombre ?? '',
      cursosAsignados: 0,
    };
  }

  async listCourseIdsByGradoSeccion(): Promise<number[]> {
    return [];
  }

  async assignStudentToCourse(
    estudianteId: number,
    cursoId: number,
    anioAcademico: number,
  ): Promise<void> {
    return this.matriculaRepo.assignStudentToCourse(
      estudianteId,
      cursoId,
      anioAcademico,
    );
  }
}
