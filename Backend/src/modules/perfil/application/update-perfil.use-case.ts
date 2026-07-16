import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@/domain/ports/user.repository.port';
import { ok } from '../../../common/dto/api-response';
import { UpdatePerfilDto } from '../presentation/dto/update-perfil.dto';

@Injectable()
export class UpdatePerfilUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(usuarioId: number, dto: UpdatePerfilDto) {
    const emailTaken = await this.userRepo.findByEmail(dto.email);

    if (emailTaken && emailTaken.id !== usuarioId) {
      throw new BadRequestException({
        message: 'Errores de validación',
        errors: { email: ['El email ya está en uso'] },
      });
    }

    const updated = await this.userRepo.updateProfile(usuarioId, {
      name: dto.name,
      email: dto.email,
      dni: dto.dni ?? null,
      telefono: dto.telefono ?? null,
      direccion: dto.direccion ?? null,
      avatar: dto.avatar?.trim() ? dto.avatar.trim() : null,
    });

    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return ok(
      {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        dni: updated.dni,
        telefono: updated.telefono,
        direccion: updated.direccion,
        avatar: updated.avatar,
      },
      'Perfil actualizado exitosamente',
    );
  }
}
