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

export interface IAdminRepository {
  getDashboardStats(): Promise<DashboardStats>;
  getSeccionesInfo(): Promise<Record<string, unknown>[]>;
  getConfiguracion(): Promise<SystemConfig | null>;
  updateConfiguracion(input: UpdateSystemConfigInput): Promise<SystemConfig>;

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

  listSeccionesByGrado(gradoId: number): Promise<Record<string, unknown>[]>;
  createSeccion(
    gradoId: number,
    nombre: string,
    capacidad: number,
  ): Promise<Record<string, unknown>>;
  updateSeccion(
    id: number,
    input: { nombre?: string; capacidad?: number },
  ): Promise<Record<string, unknown>>;
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
