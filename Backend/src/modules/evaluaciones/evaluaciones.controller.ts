import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
  DefaultValuePipe,
} from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { EvaluacionesService } from './application/evaluaciones.service';
import { CrearEvaluacionDto } from './dto/crear-evaluacion.dto';
import { ActualizarEvaluacionDto } from './dto/actualizar-evaluacion.dto';
import { ReordenarEvaluacionesDto } from './dto/reordenar-evaluaciones.dto';

@Controller('evaluaciones')
@UseGuards(RolesGuard)
export class EvaluacionesController {
  constructor(private readonly evaluacionesService: EvaluacionesService) {}

  /** Debe registrarse ANTES de las rutas :id */
  @Put('reordenar')
  @Roles('docente')
  async reordenar(@Body() dto: ReordenarEvaluacionesDto) {
    return this.evaluacionesService.reordenar(dto);
  }

  @Post()
  @Roles('docente')
  async store(
    @Body() dto: CrearEvaluacionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.evaluacionesService.crear(dto);
    if (resultado?.success === false && resultado.message?.includes('vacío')) {
      res.status(422);
      return resultado;
    }
    res.status(resultado?.success ? 201 : 500);
    return resultado;
  }

  @Put(':id')
  @Roles('docente')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEvaluacionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.evaluacionesService.actualizar(id, dto);
    if (resultado?.success === false && resultado.message?.includes('vacío')) {
      res.status(422);
      return resultado;
    }
    res.status(resultado?.success ? 200 : 400);
    return resultado;
  }

  @Delete(':id')
  @Roles('docente')
  async destroy(
    @Param('id', ParseIntPipe) id: number,
    @Query('forzar', new DefaultValuePipe(false), ParseBoolPipe) forzar: boolean,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.evaluacionesService.eliminar(id, forzar);
    if (resultado?.requires_confirmation) {
      res.status(409);
      return resultado;
    }
    res.status(resultado?.success ? 200 : 400);
    return resultado;
  }

  @Get('curso/:cursoId')
  @Roles('docente', 'estudiante', 'padre')
  getByCurso(@Param('cursoId', ParseIntPipe) cursoId: number) {
    return this.evaluacionesService.getByCurso(cursoId);
  }

  @Get('curso/:cursoId/mes/:mes')
  @Roles('docente', 'estudiante', 'padre')
  getByCursoMes(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Param('mes', ParseIntPipe) mes: number,
  ) {
    return this.evaluacionesService.getByCursoMes(cursoId, mes);
  }

  @Get(':id')
  @Roles('docente', 'estudiante', 'padre')
  show(@Param('id', ParseIntPipe) id: number) {
    return this.evaluacionesService.show(id);
  }
}
