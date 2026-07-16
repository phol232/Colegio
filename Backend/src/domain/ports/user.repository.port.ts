export { USER_REPOSITORY } from './tokens';

export type UserRole = 'docente' | 'estudiante' | 'padre' | 'admin';

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  activo: boolean;
  password?: string;
  dni?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  avatar?: string | null;
  googleId?: string | null;
  gradoId?: number | null;
  seccionId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  dni?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  avatar?: string | null;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  dni?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

export interface IUserRepository {
  findById(id: number): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByDni(dni: string): Promise<UserRecord | null>;
  listAll(filters?: { role?: UserRole }): Promise<UserRecord[]>;
  create(input: CreateUserInput): Promise<UserRecord>;
  setActivo(id: number, activo: boolean): Promise<UserRecord>;
  deleteById(id: number): Promise<void>;
  updateProfile(id: number, data: UpdateProfileInput): Promise<UserRecord>;
  updatePassword(id: number, passwordHash: string): Promise<void>;
  countByRole(role: UserRole): Promise<number>;
}
