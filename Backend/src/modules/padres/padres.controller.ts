import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthTokenGuard, AuthUser } from '../../common/guards/auth-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PadresService } from './padres.service';

@Controller()
@UseGuards(AuthTokenGuard, RolesGuard)
@Roles('padre')
export class PadresController {
  constructor(private readonly padresService: PadresService) {}

  @Get('hijos')
  listarHijos(@CurrentUser() user: AuthUser) {
    return this.padresService.listarHijos(user.usuario_id);
  }

  @Get('asistencias/hijo/:id')
  async asistenciasHijo(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) hijoId: number,
    @Query('curso_id') cursoId?: string,
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
    @Query('con_resumen') conResumen?: string,
  ) {
    await this.ensureLinked(user.usuario_id, hijoId);
    return this.padresService.asistenciasHijo(
      hijoId,
      cursoId ? Number(cursoId) : undefined,
      fechaInicio,
      fechaFin,
      conResumen === 'true',
    );
  }

  @Get('notas/hijo/:id')
  async notasHijo(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) hijoId: number,
    @Query('curso_id') cursoId?: string,
    @Query('unidad') unidad?: string,
    @Query('con_resumen') conResumen?: string,
  ) {
    await this.ensureLinked(user.usuario_id, hijoId);
    return this.padresService.notasHijo(
      hijoId,
      cursoId ? Number(cursoId) : undefined,
      unidad ? Number(unidad) : undefined,
      conResumen === 'true',
    );
  }

  @Get('hijo/:id/resumen')
  async resumenHijo(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) hijoId: number,
  ) {
    await this.ensureLinked(user.usuario_id, hijoId);
    const data = await this.padresService.resumenHijo(hijoId);
    if (!data) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    return { success: true, data };
  }

  private async ensureLinked(padreId: number, hijoId: number) {
    const linked = await this.padresService.estaVinculado(padreId, hijoId);
    if (!linked) {
      throw new ForbiddenException(
        'No tiene permisos para ver la información de este estudiante',
      );
    }
  }
}
