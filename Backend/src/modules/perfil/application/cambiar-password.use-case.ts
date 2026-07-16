import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@/domain/ports/user.repository.port';
import { CambiarPasswordDto } from '../presentation/dto/cambiar-password.dto';

@Injectable()
export class CambiarPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(usuarioId: number, dto: CambiarPasswordDto) {
    if (dto.new_password !== dto.new_password_confirmation) {
      throw new UnprocessableEntityException({
        message: 'Errores de validación',
        errors: {
          new_password_confirmation: ['La confirmación no coincide'],
        },
      });
    }

    const user = await this.userRepo.findById(usuarioId);

    if (!user?.password) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const valid = await bcrypt.compare(dto.current_password, user.password);
    if (!valid) {
      throw new UnprocessableEntityException(
        'La contraseña actual es incorrecta',
      );
    }

    const hash = await bcrypt.hash(dto.new_password, 10);
    await this.userRepo.updatePassword(usuarioId, hash);

    return {
      success: true as const,
      message: 'Contraseña actualizada exitosamente',
    };
  }
}
