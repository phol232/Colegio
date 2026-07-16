import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/guards/auth-token.guard';
import { AsistenciasService } from './application/asistencias.service';
import { RegistrarAsistenciaMasivaDto } from './dto/registrar-asistencia.dto';
import { ActualizarAsistenciaDto } from './dto/actualizar-asistencia.dto';
import { ListarAsistenciasQueryDto } from './dto/listar-asistencias.query.dto';
import { ResumenAsistenciaQueryDto } from './dto/resumen-asistencia.query.dto';
import { MisAsistenciasQueryDto } from './dto/mis-asistencias.query.dto';

@Controller('asistencias')
@UseGuards(RolesGuard)
export class AsistenciasController {
  constructor(private readonly asistenciasService: AsistenciasService) {}

  @Post()
  @Roles('docente')
  async store(
    @Body() dto: RegistrarAsistenciaMasivaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.asistenciasService.registrarMasiva(dto);
    res.status(resultado?.success ? 201 : 400);
    return resultado;
  }

  @Put(':id')
  @Roles('docente')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarAsistenciaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.asistenciasService.actualizar(id, dto.estado);
    res.status(resultado?.success ? 200 : 400);
    return resultado;
  }

  @Get()
  @Roles('docente', 'estudiante', 'padre')
  index(@Query() query: ListarAsistenciasQueryDto) {
    return this.asistenciasService.listar(query);
  }

  @Get('resumen')
  @Roles('docente', 'estudiante', 'padre')
  resumen(@Query() query: ResumenAsistenciaQueryDto) {
    return this.asistenciasService.resumen(
      query.estudiante_id,
      query.curso_id,
    );
  }

  @Get('curso/:cursoId/resumen')
  @Roles('docente', 'estudiante', 'padre')
  resumenCurso(@Param('cursoId', ParseIntPipe) cursoId: number) {
    return this.asistenciasService.resumenCurso(cursoId);
  }

  @Get('curso/:cursoId/fecha/:fecha')
  @Roles('docente', 'estudiante', 'padre')
  porCursoYFecha(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Param('fecha') fecha: string,
  ) {
    return this.asistenciasService.porCursoYFecha(cursoId, fecha);
  }

  @Get('estudiante')
  @Roles('estudiante')
  misAsistencias(
    @CurrentUser() user: AuthUser,
    @Query() query: MisAsistenciasQueryDto,
  ) {
    return this.asistenciasService.misAsistencias(user.usuario_id, query.mes);
  }

  @Get('estudiante/curso/:cursoId')
  @Roles('estudiante')
  misAsistenciasPorCurso(
    @CurrentUser() user: AuthUser,
    @Param('cursoId', ParseIntPipe) cursoId: number,
  ) {
    return this.asistenciasService.misAsistenciasPorCurso(
      user.usuario_id,
      cursoId,
    );
  }
}
