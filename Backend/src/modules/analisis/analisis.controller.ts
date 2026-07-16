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
import { AnalisisService } from './analisis.service';

@Controller('analisis')
@UseGuards(AuthTokenGuard, RolesGuard)
@Roles('docente', 'admin')
export class AnalisisController {
  constructor(private readonly analisisService: AnalisisService) {}

  @Get('rendimiento')
  async rendimiento(
    @Query('curso_id') cursoId?: string,
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
  ) {
    const data = await this.analisisService.rendimiento(
      cursoId ? Number(cursoId) : undefined,
      fechaInicio,
      fechaFin,
    );
    return { success: true, data };
  }

  @Get('curso/:id')
  async rendimientoCurso(
    @Param('id', ParseIntPipe) id: number,
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
  ) {
    const data = await this.analisisService.rendimientoCurso(
      id,
      fechaInicio,
      fechaFin,
    );
    return { success: true, data };
  }

  @Get('estudiante/:id')
  async evolucionEstudiante(
    @Param('id', ParseIntPipe) id: number,
    @Query('curso_id') cursoId?: string,
  ) {
    const data = await this.analisisService.evolucionEstudiante(
      id,
      cursoId ? Number(cursoId) : undefined,
    );
    return { success: true, data };
  }

  @Get('estadisticas')
  async estadisticas(
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
  ) {
    const data = await this.analisisService.estadisticasGenerales(
      fechaInicio,
      fechaFin,
    );
    return { success: true, data };
  }

  @Get('ranking/curso/:id')
  async rankingCurso(
    @Param('id', ParseIntPipe) id: number,
    @Query('limite') limite?: string,
  ) {
    const data = await this.analisisService.rankingCurso(
      id,
      limite ? Number(limite) : 10,
    );
    return { success: true, data };
  }

  @Get('comparativa')
  async comparativa(
    @Query('fecha_inicio') fechaInicio?: string,
    @Query('fecha_fin') fechaFin?: string,
  ) {
    const data = await this.analisisService.comparativaCursos(
      fechaInicio,
      fechaFin,
    );
    return { success: true, data };
  }
}
