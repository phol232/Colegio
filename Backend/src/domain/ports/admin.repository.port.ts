export { ADMIN_REPOSITORY } from './tokens';

export type PeriodoAcademicoEstado =
  | 'planificacion'
  | 'matricula'
  | 'activo'
  | 'cerrado';

export interface PeriodoAcademicoConfig {
  id: number;
  anio: number;
  estado: PeriodoAcademicoEstado;
  matriculaInicio: string | null;
  matriculaFin: string | null;
}

export interface SystemConfig {
  id: number;
  nombreInstitucion: string;
  anioAcademico: number;
  periodoEvaluacion: string;
  modoMantenimiento: boolean;
  periodoAcademicoActivoId: number | null;
  periodoAcademico: PeriodoAcademicoConfig | null;
  gradoIngresoId: number | null;
}

export interface UpdateSystemConfigInput extends Partial<SystemConfig> {
  periodoAcademicoEstado?: PeriodoAcademicoEstado;
  matriculaInicio?: string | null;
  matriculaFin?: string | null;
}

export interface DashboardStats {
  totalEstudiantes: number;
  totalDocentes: number;
  totalCursos: number;
  totalSecciones: number;
  estudiantesPorNivel: { primaria: number; secundaria: number };
  cursosPorNivel: { primaria: number; secundaria: number };
}

/** Sección con ocupación del período académico activo. */
export interface SeccionConCupos {
  id: number;
  gradoId: number;
  nombre: string;
  capacidad: number;
  matriculados: number;
  vacantes: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SeccionInfoDashboard {
  id: number;
  nombre: string;
  nivel: string;
  grado_numero: number;
  estudiantes_actual: number;
  capacidad: number;
  vacantes: number;
  porcentaje_ocupacion: number;
  docente_tutor: string;
}

export interface IAdminRepository {
  getDashboardStats(): Promise<DashboardStats>;
  getSeccionesInfo(): Promise<SeccionInfoDashboard[]>;
  getConfiguracion(): Promise<SystemConfig | null>;
  updateConfiguracion(input: UpdateSystemConfigInput): Promise<SystemConfig>;

  /** Conteo de matrículas activas por sección en el período activo. */
  getOcupacionSecciones(seccionIds: number[]): Promise<Record<number, number>>;

  listGrados(): Promise<Record<string, unknown>[]>;
  createGrado(
    nivel: string,
    numero: number,
    nombre: string,
  ): Promise<Record<string, unknown>>;
  updateGrado(
    id: number,
    input: { nivel?: string; numero?: number; nombre?: string },
  ): Promise<Record<string, unknown>>;
  deleteGrado(id: number): Promise<void>;

  listSeccionesByGrado(gradoId: number): Promise<SeccionConCupos[]>;
  /** Todas las secciones con cupos (una sola query de ocupación). */
  listAllSeccionesConCupos(): Promise<SeccionConCupos[]>;
  createSeccion(
    gradoId: number,
    nombre: string,
    capacidad: number,
  ): Promise<SeccionConCupos>;
  updateSeccion(
    id: number,
    input: { nombre?: string; capacidad?: number },
  ): Promise<SeccionConCupos>;
  deleteSeccion(id: number): Promise<void>;

  listAllStudents(): Promise<Record<string, unknown>[]>;
  listAvailableStudents(): Promise<Record<string, unknown>[]>;
  listStudentsBySeccion(seccionId: number): Promise<Record<string, unknown>[]>;
  assignStudentsToSeccion(
    seccionId: number,
    estudianteIds: number[],
  ): Promise<void>;

  listTeachers(): Promise<Record<string, unknown>[]>;

  listCatalogoCursos(nivel?: string): Promise<Record<string, unknown>[]>;
  createCursoCatalogo(input: {
    nombre: string;
    codigo: string;
    nivel: string;
    descripcion?: string | null;
  }): Promise<Record<string, unknown>>;
  updateCursoCatalogo(
    id: number,
    input: {
      nombre?: string;
      codigo?: string;
      nivel?: string;
      descripcion?: string | null;
    },
  ): Promise<Record<string, unknown>>;
  deleteCursoCatalogo(id: number): Promise<void>;

  assignCursosSeccion(
    seccionId: number,
    docenteId: number,
    cursosCatalogoIds: number[],
  ): Promise<void>;
  listCursosSeccion(seccionId: number): Promise<Record<string, unknown>[]>;
  unassignCursoSeccion(cursoId: number): Promise<void>;
  updateDocenteCurso(cursoId: number, docenteId: number): Promise<void>;
}
