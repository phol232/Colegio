export { GRADE_REPOSITORY } from './tokens';

export interface NotaDetalleRecord {
  id: number;
  evaluacionId: number;
  estudianteId: number;
  puntaje: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotaLegacyRecord {
  id: number;
  estudianteId: number;
  cursoId: number;
  unidad: number;
  puntaje: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PromedioUnidadRecord {
  id: number;
  estudianteId: number;
  cursoId: number;
  unidad: number;
  promedioNumerico: number;
  promedioLiteral: string | null;
  totalEvaluaciones: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateNotaDetalleInput {
  evaluacionId: number;
  estudianteId: number;
  puntaje: number;
}

export interface BulkNotaDetalleInput {
  evaluacionId: number;
  estudianteId: number;
  puntaje: number;
}

export interface IGradeRepository {
  findNotaDetalleById(id: number): Promise<NotaDetalleRecord | null>;
  createNotaDetalle(input: CreateNotaDetalleInput): Promise<NotaDetalleRecord>;
  createNotasDetalleBulk(
    notas: BulkNotaDetalleInput[],
  ): Promise<{ success: boolean; inserted: number }>;
  updateNotaDetalle(id: number, puntaje: number): Promise<NotaDetalleRecord>;
  deleteNotaDetalle(id: number): Promise<void>;
  listNotasByEvaluacion(evaluacionId: number): Promise<NotaDetalleRecord[]>;
  listNotasByEstudianteCurso(
    estudianteId: number,
    cursoId: number,
  ): Promise<NotaDetalleRecord[]>;

  findPromedio(
    estudianteId: number,
    cursoId: number,
    unidad: number,
  ): Promise<PromedioUnidadRecord | null>;
  listPromediosByEstudianteCurso(
    estudianteId: number,
    cursoId: number,
  ): Promise<PromedioUnidadRecord[]>;
  listPromediosByCursoUnidad(
    cursoId: number,
    unidad: number,
  ): Promise<PromedioUnidadRecord[]>;
  recalcularPromediosCursoUnidad(
    cursoId: number,
    unidad: number,
  ): Promise<number>;

  findNotaLegacyById(id: number): Promise<NotaLegacyRecord | null>;
  createNotaLegacy(
    estudianteId: number,
    cursoId: number,
    unidad: number,
    puntaje: number,
  ): Promise<NotaLegacyRecord>;
  updateNotaLegacy(id: number, puntaje: number): Promise<NotaLegacyRecord>;
  deleteNotaLegacy(id: number): Promise<void>;
  listNotasLegacy(filters: {
    estudianteId?: number;
    cursoId?: number;
    unidad?: number;
  }): Promise<NotaLegacyRecord[]>;
}
