import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { NotasDetalleService } from './application/notas-detalle.service';
import { CrearNotaDetalleDto } from './dto/crear-nota-detalle.dto';
import { CrearNotasBulkDto } from './dto/crear-notas-bulk.dto';
import { ActualizarNotaDetalleDto } from './dto/actualizar-nota-detalle.dto';

@Controller('notas-detalle')
@UseGuards(RolesGuard)
export class NotasDetalleController {
  constructor(private readonly notasDetalleService: NotasDetalleService) {}

  @Post()
  @Roles('docente')
  async store(
    @Body() dto: CrearNotaDetalleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.notasDetalleService.crear(dto);
    res.status(resultado?.success ? 201 : 400);
    return resultado;
  }

  @Post('bulk')
  @Roles('docente')
  async storeBulk(
    @Body() dto: CrearNotasBulkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.notasDetalleService.crearBulk(dto);
    if (resultado?._status === 422) {
      const { _status, ...body } = resultado;
      res.status(422);
      return body;
    }
    res.status(resultado?.success ? 201 : 207);
    return resultado;
  }

  @Get('evaluacion/:evaluacionId')
  @Roles('docente', 'estudiante', 'padre')
  getByEvaluacion(
    @Param('evaluacionId', ParseIntPipe) evaluacionId: number,
  ) {
    return this.notasDetalleService.getByEvaluacion(evaluacionId);
  }

  @Get('estudiante/:estudianteId/curso/:cursoId/unidad/:unidad')
  @Roles('docente', 'estudiante', 'padre')
  getByEstudianteCursoUnidad(
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Param('unidad', ParseIntPipe) unidad: number,
  ) {
    return this.notasDetalleService.getByEstudianteCursoUnidad(
      estudianteId,
      cursoId,
      unidad,
    );
  }

  @Get(':id')
  @Roles('docente', 'estudiante', 'padre')
  show(@Param('id', ParseIntPipe) id: number) {
    return this.notasDetalleService.show(id);
  }

  @Put(':id')
  @Roles('docente')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarNotaDetalleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.notasDetalleService.actualizar(
      id,
      dto.puntaje,
    );
    res.status(resultado?.success ? 200 : 400);
    return resultado;
  }

  @Delete(':id')
  @Roles('docente')
  async destroy(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.notasDetalleService.eliminar(id);
    res.status(resultado?.success ? 200 : 400);
    return resultado;
  }
}
