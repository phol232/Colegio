import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateUserInput,
  IUserRepository,
  UpdateProfileInput,
  UserRecord,
  UserRole,
} from '@/domain/ports/user.repository.port';
import { UsuarioEntity } from '../entities/oltp/usuario.entity';
import { OLTP_CONNECTION } from './typeorm-unit-of-work';

function mapUser(entity: UsuarioEntity): UserRecord {
  return {
    id: Number(entity.id),
    email: entity.email,
    name: entity.name,
    role: entity.role as UserRole,
    activo: entity.activo ?? true,
    password: entity.password,
    dni: entity.dni,
    telefono: entity.telefono,
    direccion: entity.direccion,
    avatar: entity.avatar,
    googleId: entity.googleId,
    gradoId: entity.gradoId != null ? Number(entity.gradoId) : null,
    seccionId: entity.seccionId != null ? Number(entity.seccionId) : null,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UsuarioEntity, OLTP_CONNECTION)
    private readonly repo: Repository<UsuarioEntity>,
  ) {}

  async findById(id: number): Promise<UserRecord | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? mapUser(entity) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const entity = await this.repo.findOne({ where: { email } });
    return entity ? mapUser(entity) : null;
  }

  async findByDni(dni: string): Promise<UserRecord | null> {
    const entity = await this.repo.findOne({ where: { dni } });
    return entity ? mapUser(entity) : null;
  }

  async listAll(filters?: { role?: UserRole }): Promise<UserRecord[]> {
    const entities = await this.repo.find({
      where: filters?.role ? { role: filters.role } : {},
      order: { name: 'ASC' },
    });
    return entities.map(mapUser);
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const entity = this.repo.create({
      email: input.email,
      password: input.passwordHash,
      name: input.name,
      role: input.role,
      dni: input.dni ?? null,
      telefono: input.telefono ?? null,
      direccion: input.direccion ?? null,
      activo: true,
    });
    const saved = await this.repo.save(entity);
    return mapUser(saved);
  }

  async setActivo(id: number, activo: boolean): Promise<UserRecord> {
    await this.repo.update(id, { activo, updatedAt: new Date() });
    const updated = await this.repo.findOneOrFail({ where: { id } });
    return mapUser(updated);
  }

  async deleteById(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async updateProfile(
    id: number,
    data: UpdateProfileInput,
  ): Promise<UserRecord> {
    await this.repo.update(id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.dni !== undefined ? { dni: data.dni } : {}),
      ...(data.telefono !== undefined ? { telefono: data.telefono } : {}),
      ...(data.direccion !== undefined ? { direccion: data.direccion } : {}),
      ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
      updatedAt: new Date(),
    });

    const updated = await this.repo.findOneOrFail({ where: { id } });
    return mapUser(updated);
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await this.repo.update(id, {
      password: passwordHash,
      updatedAt: new Date(),
    });
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.repo.count({ where: { role } });
  }
}
