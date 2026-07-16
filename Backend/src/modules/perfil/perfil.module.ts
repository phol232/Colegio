import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PerfilController } from './presentation/perfil.controller';
import { GetPerfilUseCase } from './application/get-perfil.use-case';
import { UpdatePerfilUseCase } from './application/update-perfil.use-case';
import { CambiarPasswordUseCase } from './application/cambiar-password.use-case';

@Module({
  imports: [CommonModule],
  controllers: [PerfilController],
  providers: [GetPerfilUseCase, UpdatePerfilUseCase, CambiarPasswordUseCase],
})
export class PerfilModule {}
