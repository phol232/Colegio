export { AUTH_REPOSITORY } from './tokens';
import { UserRole } from './user.repository.port';

export interface RegisterUserInput {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  dni?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

export interface AuthSession {
  usuarioId: number;
  email: string;
  name: string;
  role: UserRole;
  dni?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  avatar?: string | null;
  token: string;
  expiresAt: Date;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  code?: string;
  session?: AuthSession;
}

export interface IAuthRepository {
  register(input: RegisterUserInput): Promise<AuthResult>;
  login(email: string, plainPassword: string): Promise<AuthResult>;
  validateToken(token: string): Promise<AuthSession | null>;
  isTokenForBlockedUser(token: string): Promise<boolean>;
  logout(token: string): Promise<void>;
  revokeAllTokensForUser(usuarioId: number): Promise<void>;
  cleanupExpiredTokens(): Promise<number>;
}
