import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@/domain/ports/user.repository.port';
import { ok } from '../../../common/dto/api-response';

@Injectable()
export class GetPerfilUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(usuarioId: number) {
    const user = await this.userRepo.findById(usuarioId);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      dni: user.dni,
      telefono: user.telefono,
      direccion: user.direccion,
      avatar: user.avatar,
      created_at: user.createdAt,
    });
  }
}
