import { AuthResult, AuthSession } from '@/domain/ports/auth.repository.port';

export interface AuthUserData {
  usuario_id: number;
  email: string;
  name: string;
  role: string;
  dni?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  avatar?: string | null;
  token?: string;
  expires_at?: string;
}

export interface AuthFunctionResult {
  success: boolean;
  message?: string;
  code?: string;
  data?: AuthUserData;
  errors?: unknown;
}

export function toAuthFunctionResult(result: AuthResult): AuthFunctionResult {
  if (!result.success) {
    return {
      success: false,
      message: result.message,
      ...(result.code ? { code: result.code } : {}),
    };
  }

  const session = result.session;
  if (!session) {
    return {
      success: false,
      message: result.message ?? 'Error de autenticación',
    };
  }

  return {
    success: true,
    data: mapAuthSessionToUserData(session),
  };
}

export function mapAuthSessionToUserData(session: AuthSession): AuthUserData {
  return {
    usuario_id: session.usuarioId,
    email: session.email,
    name: session.name,
    role: session.role,
    dni: session.dni,
    telefono: session.telefono,
    direccion: session.direccion,
    avatar: session.avatar,
    token: session.token,
    expires_at: session.expiresAt.toISOString(),
  };
}
