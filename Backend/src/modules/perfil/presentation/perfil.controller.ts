import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../../common/guards/auth-token.guard';
import { GetPerfilUseCase } from '../application/get-perfil.use-case';
import { UpdatePerfilUseCase } from '../application/update-perfil.use-case';
import { CambiarPasswordUseCase } from '../application/cambiar-password.use-case';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';

@Controller('perfil')
export class PerfilController {
  constructor(
    private readonly getPerfil: GetPerfilUseCase,
    private readonly updatePerfil: UpdatePerfilUseCase,
    private readonly cambiarPassword: CambiarPasswordUseCase,
  ) {}

  @Get()
  show(@CurrentUser() user: AuthUser) {
    return this.getPerfil.execute(user.usuario_id);
  }

  @Put()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdatePerfilDto) {
    return this.updatePerfil.execute(user.usuario_id, dto);
  }

  @Post('cambiar-password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: CambiarPasswordDto,
  ) {
    return this.cambiarPassword.execute(user.usuario_id, dto);
  }
}
