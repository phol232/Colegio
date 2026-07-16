export { EVALUATION_REPOSITORY } from './tokens';

export interface EvaluationRecord {
  id: number;
  cursoId: number;
  unidad: number | null;
  mes: number;
  nombre: string;
  tipoEvaluacion: string;
  peso: number | null;
  orden: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateEvaluationInput {
  cursoId: number;
  mes: number;
  unidad: number;
  nombre: string;
  tipoEvaluacion: string;
  peso?: number | null;
  orden?: number;
}

export interface UpdateEvaluationInput {
  nombre?: string;
  tipoEvaluacion?: string;
  peso?: number | null;
}

export interface ReorderEvaluationItem {
  id: number;
  orden: number;
}

export interface DeleteEvaluationResult {
  success: boolean;
  message?: string;
  requiresConfirmation?: boolean;
  notasCount?: number;
}

export interface IEvaluationRepository {
  findById(id: number): Promise<EvaluationRecord | null>;
  listByCourse(cursoId: number, mes?: number): Promise<EvaluationRecord[]>;
  listByCourseUnit(cursoId: number, unidad: number): Promise<EvaluationRecord[]>;
  create(input: CreateEvaluationInput): Promise<EvaluationRecord>;
  update(id: number, input: UpdateEvaluationInput): Promise<EvaluationRecord>;
  reorder(cursoId: number, items: ReorderEvaluationItem[]): Promise<void>;
  delete(id: number, force?: boolean): Promise<DeleteEvaluationResult>;
  sumWeightsByCourseUnit(
    cursoId: number,
    unidad: number,
    excludeEvaluationId?: number,
  ): Promise<number>;
  countNotas(id: number): Promise<number>;
  getNextOrden(cursoId: number, mes: number): Promise<number>;
}
