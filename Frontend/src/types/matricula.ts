export interface PeriodoMatricula {
  id: number;
  anio: number;
  estado: string;
  matriculaInicio: string | null;
  matriculaFin: string | null;
}

export interface GradoMatricula {
  id: number;
  nombre: string;
  nivel: string;
  numero: number;
}

export interface SeccionMatricula {
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
  estado: 'pendiente' | 'activa' | 'rechazada' | 'retirada';
  tipo: string;
  observaciones: string | null;
  grado?: GradoMatricula;
  seccion?: SeccionMatricula | null;
  estudianteNombre?: string;
  estudianteEmail?: string;
  estudianteDni?: string | null;
  periodoAnio?: number;
}

export interface PropuestaMatricula {
  puedeSolicitar: boolean;
  motivoBloqueo: string | null;
  periodo: PeriodoMatricula | null;
  gradoPropuesto: GradoMatricula | null;
  tipoPropuesto: string | null;
  seccionesDisponibles: SeccionMatricula[];
  requisitosPendientes: string[];
}

export interface EstadoMatriculaResponse {
  success: boolean;
  matriculado: boolean;
  periodo: PeriodoMatricula | null;
  matricula_vigente: MatriculaRecord | null;
  solicitud_pendiente: MatriculaRecord | null;
  propuesta: PropuestaMatricula;
  acciones: {
    puedeSolicitar: boolean;
    puedeCancelar: boolean;
  };
  info: { grado: string; seccion: string } | null;
}
