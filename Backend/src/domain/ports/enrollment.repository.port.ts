export { ENROLLMENT_REPOSITORY } from './tokens';

export interface EnrollmentState {
  matriculado: boolean;
  gradoId?: number | null;
  seccionId?: number | null;
  gradoNombre?: string | null;
  seccionNombre?: string | null;
}

export interface MatriculaOptions {
  grados: Array<{ id: number; nivel: string; numero: number; nombre: string }>;
  secciones: Array<{
    id: number;
    gradoId: number;
    nombre: string;
    capacidad: number;
  }>;
}

export interface MatriculaResult {
  grado: string;
  seccion: string;
  cursosAsignados: number;
}

export interface IEnrollmentRepository {
  getMatriculaOptions(): Promise<MatriculaOptions>;
  getEnrollmentState(estudianteId: number): Promise<EnrollmentState>;
  matricular(
    estudianteId: number,
    gradoId: number,
    seccionId: number,
  ): Promise<MatriculaResult>;
  listCourseIdsByGradoSeccion(
    gradoId: number,
    seccionId: number,
  ): Promise<number[]>;
  assignStudentToCourse(
    estudianteId: number,
    cursoId: number,
    anioAcademico: number,
  ): Promise<void>;
}
