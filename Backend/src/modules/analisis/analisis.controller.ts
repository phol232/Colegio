import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthTokenGuard } from '../../common/guards/auth-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/guards/auth-token.guard';
import { AnalisisService } from './analisis.service';

@Controller('analisis')
@UseGuards(AuthTokenGuard, RolesGuard)
@Roles('docente', 'admin')
export class AnalisisController {
  constructor(private readonly analisisService: AnalisisService) {}

  @Get('version')
  async version() {
    const data = await this.analisisService.getVersion();
    return { success: true, data };
  }

  @Get('rendimiento')
  async rendimiento(
    @CurrentUser() user: AuthUser,
    @Query('curso_id') cursoId?: string,
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
  ) {
    const data = await this.analisisService.rendimiento(
      user,
      cursoId ? Number(cursoId) : undefined,
      fechaInicio,
      fechaFin,
    );
    return { success: true, data };
  }

  @Get('curso/:id')
  async rendimientoCurso(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
  ) {
    const data = await this.analisisService.rendimientoCurso(
      user,
      id,
      fechaInicio,
      fechaFin,
    );
    return { success: true, data };
  }

  @Get('estudiante/:id')
  async evolucionEstudiante(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('curso_id') cursoId?: string,
  ) {
    const data = await this.analisisService.evolucionEstudiante(
      user,
      id,
      cursoId ? Number(cursoId) : undefined,
    );
    return { success: true, data };
  }

  @Get('estadisticas')
  async estadisticas(
    @CurrentUser() user: AuthUser,
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
  ) {
    const data = await this.analisisService.estadisticasGenerales(
      user,
      fechaInicio,
      fechaFin,
    );
    return { success: true, data };
  }

  @Get('ranking/curso/:id')
  async rankingCurso(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('limite') limite?: string,
  ) {
    const data = await this.analisisService.rankingCurso(
      user,
      id,
      limite ? Number(limite) : 10,
    );
    return { success: true, data };
  }

  @Get('comparativa')
  async comparativa(
    @CurrentUser() user: AuthUser,
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
  ) {
    const data = await this.analisisService.comparativaCursos(
      user,
      fechaInicio,
      fechaFin,
    );
    return { success: true, data };
  }
}
