import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '@/domain/ports/auth.repository.port';
import { mapAuthSessionToUserData } from '@/modules/auth/domain/auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CacheService } from '../redis/cache.service';

export interface AuthUser {
  usuario_id: number;
  email: string;
  name: string;
  role: string;
  dni?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  avatar?: string | null;
  [key: string]: unknown;
}

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_REPOSITORY)
    private readonly authRepo: IAuthRepository,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    const cacheKey = this.cache.authTokenKey(token);
    let user = await this.cache.get<AuthUser>(cacheKey);

    if (user) {
      const blocked = await this.cache.get<boolean>(`blocked:user:${user.usuario_id}`);
      if (blocked) {
        throw new UnauthorizedException({
          message:
            'Tu cuenta ha sido bloqueada. Por favor, contacta al administrador del sistema.',
          code: 'ACCOUNT_BLOCKED',
        });
      }
    }

    if (!user) {
      const session = await this.authRepo.validateToken(token);

      if (!session) {
        const blocked = await this.authRepo.isTokenForBlockedUser(token);
        if (blocked) {
          throw new UnauthorizedException({
            message:
              'Tu cuenta ha sido bloqueada. Por favor, contacta al administrador del sistema.',
            code: 'ACCOUNT_BLOCKED',
          });
        }
        throw new UnauthorizedException('Token inválido o expirado');
      }

      user = mapAuthSessionToUserData(session) as AuthUser;
      const ttl = this.config.get<number>('authTokenCacheTtl') ?? 60;
      await this.cache.set(cacheKey, user, ttl);
    }

    request.user = user;
    request.authToken = token;
    return true;
  }

  private extractBearerToken(request: {
    headers?: Record<string, string | string[] | undefined>;
  }): string | null {
    const header = request.headers?.authorization;
    if (!header || Array.isArray(header)) {
      return null;
    }

    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token.trim();
  }
}
