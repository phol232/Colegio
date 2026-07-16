import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PromediosService } from './application/promedios.service';
import { RecalcularPromediosDto } from './dto/recalcular-promedios.dto';

@Controller('promedios')
@UseGuards(RolesGuard)
export class PromediosController {
  constructor(private readonly promediosService: PromediosService) {}

  @Get('estudiante/:estudianteId/curso/:cursoId/unidad/:unidad')
  @Roles('docente', 'estudiante', 'padre')
  getByEstudianteCursoUnidad(
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Param('unidad', ParseIntPipe) unidad: number,
  ) {
    return this.promediosService.getByEstudianteCursoUnidad(
      estudianteId,
      cursoId,
      unidad,
    );
  }

  @Get('estudiante/:estudianteId/curso/:cursoId')
  @Roles('docente', 'estudiante', 'padre')
  getByEstudianteCurso(
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Param('cursoId', ParseIntPipe) cursoId: number,
  ) {
    return this.promediosService.getByEstudianteCurso(estudianteId, cursoId);
  }

  @Get('curso/:cursoId/unidad/:unidad')
  @Roles('docente', 'estudiante', 'padre')
  getByCursoUnidad(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Param('unidad', ParseIntPipe) unidad: number,
  ) {
    return this.promediosService.getByCursoUnidad(cursoId, unidad);
  }

  @Get('ranking/curso/:cursoId/unidad/:unidad')
  @Roles('docente', 'estudiante', 'padre')
  getRanking(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Param('unidad', ParseIntPipe) unidad: number,
  ) {
    return this.promediosService.getRanking(cursoId, unidad);
  }

  @Get('estadisticas/curso/:cursoId')
  @Roles('docente', 'estudiante', 'padre')
  getEstadisticasCurso(@Param('cursoId', ParseIntPipe) cursoId: number) {
    return this.promediosService.getEstadisticasCurso(cursoId);
  }

  @Post('recalcular')
  @Roles('docente')
  async recalcular(
    @Body() dto: RecalcularPromediosDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.promediosService.recalcular(dto);
    res.status(resultado?.success ? 200 : 400);
    return resultado;
  }
}
