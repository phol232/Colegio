export { MATRICULA_REPOSITORY } from './tokens';

export type MatriculaEstado = 'pendiente' | 'activa' | 'rechazada' | 'retirada';
export type MatriculaTipo = 'ingreso' | 'continuidad' | 'repeticion' | 'traslado';
export type MatriculaOrigen = 'estudiante' | 'admin' | 'migracion';
export type PeriodoEstado = 'planificacion' | 'matricula' | 'activo' | 'cerrado';
export type ResultadoPromocion = 'promovido' | 'repite' | 'egresado';

export interface PeriodoRecord {
  id: number;
  anio: number;
  estado: PeriodoEstado;
  matriculaInicio: string | null;
  matriculaFin: string | null;
}

export interface GradoRecord {
  id: number;
  nombre: string;
  nivel: string;
  numero: number;
}

export interface SeccionRecord {
  id: number;
  gradoId: number;
  nombre: string;
  capacidad: number;
  matriculados?: number;
}

export interface MatriculaRecord {
  id: number;
  estudianteId: number;
  periodoAcademicoId: number;
  gradoId: number;
  seccionId: number | null;
  estado: MatriculaEstado;
  tipo: MatriculaTipo;
  origen: MatriculaOrigen;
  observaciones: string | null;
  solicitadoPor: number | null;
  confirmadoPor: number | null;
  confirmadoAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  grado?: GradoRecord;
  seccion?: SeccionRecord | null;
  estudianteNombre?: string;
  estudianteEmail?: string;
  estudianteDni?: string | null;
  periodoAnio?: number;
}

export interface DecisionPromocionRecord {
  id: number;
  matriculaOrigenId: number;
  resultado: ResultadoPromocion;
  gradoDestinoId: number | null;
  motivo: string | null;
  registradoPor: number | null;
}

export interface PropuestaMatricula {
  puedeSolicitar: boolean;
  motivoBloqueo: string | null;
  periodo: PeriodoRecord | null;
  gradoPropuesto: GradoRecord | null;
  tipoPropuesto: MatriculaTipo | null;
  seccionesDisponibles: SeccionRecord[];
  requisitosPendientes: string[];
}

export interface EstadoMatriculaCompleto {
  periodo: PeriodoRecord | null;
  matriculaVigente: MatriculaRecord | null;
  solicitudPendiente: MatriculaRecord | null;
  propuesta: PropuestaMatricula;
  acciones: {
    puedeSolicitar: boolean;
    puedeCancelar: boolean;
  };
}

export interface ListarMatriculasFilters {
  periodoId?: number;
  estado?: MatriculaEstado;
  gradoId?: number;
  seccionId?: number;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export interface ListarMatriculasResult {
  items: MatriculaRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface RegistrarDecisionInput {
  matriculaOrigenId: number;
  resultado: ResultadoPromocion;
  gradoDestinoId?: number | null;
  motivo?: string | null;
  registradoPor: number;
}

export interface IMatriculaRepository {
  getPeriodoActivo(): Promise<PeriodoRecord | null>;
  getPeriodoById(id: number): Promise<PeriodoRecord | null>;
  getGradoIngresoId(): Promise<number | null>;

  getEstadoCompleto(estudianteId: number): Promise<EstadoMatriculaCompleto>;
  getPropuesta(estudianteId: number): Promise<PropuestaMatricula>;

  solicitarMatricula(
    estudianteId: number,
    observaciones?: string,
  ): Promise<MatriculaRecord>;

  cancelarSolicitud(estudianteId: number, matriculaId: number): Promise<void>;

  listarAdmin(filters: ListarMatriculasFilters): Promise<ListarMatriculasResult>;

  aprobarMatricula(
    matriculaId: number,
    seccionId: number,
    adminId: number,
  ): Promise<MatriculaRecord>;

  rechazarMatricula(
    matriculaId: number,
    adminId: number,
    observaciones?: string,
  ): Promise<MatriculaRecord>;

  retirarMatricula(
    matriculaId: number,
    adminId: number,
    observaciones?: string,
  ): Promise<MatriculaRecord>;

  reasignarSeccion(
    matriculaId: number,
    seccionId: number,
    adminId: number,
  ): Promise<MatriculaRecord>;

  registrarDecision(input: RegistrarDecisionInput): Promise<DecisionPromocionRecord>;

  listarDecisionesPendientes(periodoId: number): Promise<
    Array<{
      matricula: MatriculaRecord;
      decision: DecisionPromocionRecord | null;
    }>
  >;

  getResumenPeriodo(periodoId: number): Promise<{
    pendientes: number;
    activas: number;
    rechazadas: number;
    retiradas: number;
    sinSeccion: number;
  }>;

  getChecklistPeriodo(periodoId: number): Promise<{
    gradosConfigurados: boolean;
    seccionesConfiguradas: boolean;
    cursosAsignados: boolean;
    ventanaAbierta: boolean;
    decisionesPendientes: number;
  }>;

  /** Legacy adapter */
  getEnrollmentState(estudianteId: number): Promise<{
    matriculado: boolean;
    gradoId?: number | null;
    seccionId?: number | null;
    gradoNombre?: string | null;
    seccionNombre?: string | null;
  }>;

  assignStudentToCourse(
    estudianteId: number,
    cursoId: number,
    anioAcademico: number,
  ): Promise<void>;

  assignStudentsToSeccionLegacy(
    seccionId: number,
    estudianteIds: number[],
    adminId: number,
  ): Promise<void>;

  /** Sincroniza estudiantes_cursos con los cursos vigentes de la matrícula activa. */
  reconcileEstudianteCursosForMatricula(matriculaId: number): Promise<void>;

  /** Sincroniza estudiantes_cursos para todas las matrículas activas de una sección y período. */
  reconcileActiveMatriculasForSeccion(
    seccionId: number,
    periodoAcademicoId: number,
  ): Promise<void>;
}
