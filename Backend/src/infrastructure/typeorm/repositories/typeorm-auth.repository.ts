import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { MoreThan, Repository } from 'typeorm';
import {
  AuthResult,
  AuthSession,
  IAuthRepository,
  RegisterUserInput,
} from '@/domain/ports/auth.repository.port';
import { UserRole } from '@/domain/ports/user.repository.port';
import { AuthTokenService } from '@/domain/services/auth-token.service';
import { AuthTokenEntity } from '../entities/oltp/auth-token.entity';
import { UsuarioEntity } from '../entities/oltp/usuario.entity';
import { OLTP_CONNECTION } from './typeorm-unit-of-work';

function mapSession(
  user: UsuarioEntity,
  token: string,
  expiresAt: Date,
): AuthSession {
  return {
    usuarioId: Number(user.id),
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    dni: user.dni,
    telefono: user.telefono,
    direccion: user.direccion,
    avatar: user.avatar,
    token,
    expiresAt,
  };
}

@Injectable()
export class TypeOrmAuthRepository implements IAuthRepository {
  constructor(
    @InjectRepository(UsuarioEntity, OLTP_CONNECTION)
    private readonly userRepo: Repository<UsuarioEntity>,
    @InjectRepository(AuthTokenEntity, OLTP_CONNECTION)
    private readonly tokenRepo: Repository<AuthTokenEntity>,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async register(input: RegisterUserInput): Promise<AuthResult> {
    const existingEmail = await this.userRepo.findOne({
      where: { email: input.email },
    });
    if (existingEmail) {
      return { success: false, message: 'El email ya está registrado' };
    }

    if (input.dni) {
      const existingDni = await this.userRepo.findOne({
        where: { dni: input.dni },
      });
      if (existingDni) {
        return { success: false, message: 'El DNI ya está registrado' };
      }
    }

    const user = this.userRepo.create({
      email: input.email,
      password: input.passwordHash,
      name: input.name,
      role: input.role,
      dni: input.dni ?? null,
      telefono: input.telefono ?? null,
      direccion: input.direccion ?? null,
    });
    const savedUser = await this.userRepo.save(user);
    const session = await this.createSession(savedUser);

    return { success: true, session };
  }

  async login(email: string, plainPassword: string): Promise<AuthResult> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      return { success: false, message: 'Credenciales inválidas' };
    }

    if (user.activo === false) {
      return {
        success: false,
        message:
          'Tu cuenta ha sido bloqueada. Por favor, contacta al administrador del sistema.',
        code: 'ACCOUNT_BLOCKED',
      };
    }

    const valid = await bcrypt.compare(plainPassword, user.password);
    if (!valid) {
      return { success: false, message: 'Credenciales inválidas' };
    }

    const session = await this.createSession(user);
    return { success: true, session };
  }

  async validateToken(token: string): Promise<AuthSession | null> {
    const storedHash = this.authTokenService.hashToken(token);
    const authToken = await this.tokenRepo.findOne({
      where: {
        token: storedHash,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!authToken) {
      return null;
    }

    const user = await this.userRepo.findOne({
      where: { id: authToken.usuarioId },
    });
    if (!user || user.activo === false) {
      return null;
    }

    return mapSession(user, token, authToken.expiresAt);
  }

  async isTokenForBlockedUser(token: string): Promise<boolean> {
    const storedHash = this.authTokenService.hashToken(token);
    const authToken = await this.tokenRepo.findOne({
      where: {
        token: storedHash,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!authToken) {
      return false;
    }

    const user = await this.userRepo.findOne({
      where: { id: authToken.usuarioId },
    });

    return !!user && user.activo === false;
  }

  async logout(token: string): Promise<void> {
    const storedHash = this.authTokenService.hashToken(token);
    await this.tokenRepo.delete({ token: storedHash });
  }

  async revokeAllTokensForUser(usuarioId: number): Promise<void> {
    await this.tokenRepo.delete({ usuarioId });
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.tokenRepo
      .createQueryBuilder()
      .delete()
      .where('expires_at <= :now', { now: new Date() })
      .execute();
    return result.affected ?? 0;
  }

  private async createSession(user: UsuarioEntity): Promise<AuthSession> {
    const plainToken = this.authTokenService.generateToken();
    const hashedToken = this.authTokenService.hashToken(plainToken);
    const expiresAt = this.authTokenService.getExpiresAt();

    const authToken = this.tokenRepo.create({
      usuarioId: user.id,
      token: hashedToken,
      expiresAt,
    });
    await this.tokenRepo.save(authToken);

    return mapSession(user, plainToken, expiresAt);
  }
}
