import { Inject, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '@/domain/ports/auth.repository.port';
import { CacheService } from '@/common/redis/cache.service';
import { AuthUser } from '@/common/guards/auth-token.guard';
import { mapAuthSessionToUserData } from '@/modules/auth/domain/auth.types';

export const ANALISIS_ROOM_ALL = 'analisis:all';
export const analisisDocenteRoom = (docenteId: number) =>
  `analisis:docente:${docenteId}`;

export interface AnalisisActualizadoPayload {
  version: number;
  cursoId?: number;
  docenteId?: number;
}

@WebSocketGateway({
  path: '/api/socket.io',
  namespace: '/analisis',
  cors: { origin: true, credentials: true },
})
export class AnalisisGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AnalisisGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: IAuthRepository,
    private readonly cache: CacheService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const user = await this.resolveUser(token);
      if (!user || (user.role !== 'admin' && user.role !== 'docente')) {
        client.disconnect(true);
        return;
      }

      client.data.user = user;

      if (user.role === 'admin') {
        await client.join(ANALISIS_ROOM_ALL);
      } else {
        await client.join(analisisDocenteRoom(Number(user.usuario_id)));
      }

      this.logger.debug(
        `WS analisis conectado user=${user.usuario_id} role=${user.role}`,
      );
    } catch (error) {
      this.logger.warn(
        `WS analisis auth falló: ${error instanceof Error ? error.message : error}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data?.user as AuthUser | undefined;
    if (user) {
      this.logger.debug(`WS analisis desconectado user=${user.usuario_id}`);
    }
  }

  emitirCambio(payload: AnalisisActualizadoPayload) {
    if (!this.server) {
      return;
    }

    this.server.to(ANALISIS_ROOM_ALL).emit('analisis:actualizado', payload);

    if (payload.docenteId != null) {
      this.server
        .to(analisisDocenteRoom(payload.docenteId))
        .emit('analisis:actualizado', payload);
    } else {
      // Sin docente: notificar a todos los docentes (comparativa/generales)
      this.server.emit('analisis:actualizado', payload);
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string') {
      const [scheme, token] = header.split(' ');
      if (scheme?.toLowerCase() === 'bearer' && token) {
        return token.trim();
      }
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim()) {
      return queryToken.trim();
    }

    return null;
  }

  private async resolveUser(token: string): Promise<AuthUser | null> {
    const cacheKey = this.cache.authTokenKey(token);
    const cached = await this.cache.get<AuthUser>(cacheKey);
    if (cached) {
      return cached;
    }

    const session = await this.authRepo.validateToken(token);
    if (!session) {
      return null;
    }

    return mapAuthSessionToUserData(session) as AuthUser;
  }
}
