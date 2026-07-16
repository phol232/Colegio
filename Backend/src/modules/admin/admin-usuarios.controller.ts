import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthTokenGuard } from '../../common/guards/auth-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/guards/auth-token.guard';
import { AdminService } from './admin.service';
import { CambiarEstadoUsuarioDto, CrearUsuarioDto } from './dto/admin.dto';

@Controller('admin')
@UseGuards(AuthTokenGuard, RolesGuard)
@Roles('admin')
export class AdminUsuariosController {
  constructor(private readonly adminService: AdminService) {}

  @Get('usuarios')
  listarUsuarios(@Query('role') role?: string) {
    return this.adminService.listarUsuarios(role);
  }

  @Post('usuarios')
  @HttpCode(201)
  crearUsuario(@Body() dto: CrearUsuarioDto) {
    return this.adminService.crearUsuario(dto);
  }

  @Patch('usuarios/:id/estado')
  @HttpCode(200)
  cambiarEstadoUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoUsuarioDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.cambiarEstadoUsuario(id, dto, user.usuario_id);
  }

  @Delete('usuarios/:id')
  @HttpCode(200)
  eliminarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.eliminarUsuario(id, user.usuario_id);
  }
}
