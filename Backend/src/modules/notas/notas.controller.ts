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
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AuthUser } from '@/common/guards/auth-token.guard';
import { NotasService } from './application/notas.service';
import { CrearNotaLegacyDto } from './dto/crear-nota-legacy.dto';
import { ActualizarNotaLegacyDto } from './dto/actualizar-nota-legacy.dto';
import { ListarNotasQueryDto } from './dto/listar-notas.query.dto';
import { ResumenNotasQueryDto } from './dto/resumen-notas.query.dto';

@Controller('notas')
@UseGuards(RolesGuard)
export class NotasController {
  constructor(private readonly notasService: NotasService) {}

  @Post()
  @Roles('docente')
  async store(
    @Body() dto: CrearNotaLegacyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.notasService.registrar(dto);
    res.status(resultado?.success ? 201 : 400);
    return resultado;
  }

  @Put(':id')
  @Roles('docente')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarNotaLegacyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.notasService.actualizar(id, dto);
    res.status(resultado?.success ? 200 : 400);
    return resultado;
  }

  @Get()
  @Roles('docente', 'estudiante', 'padre')
  index(@Query() query: ListarNotasQueryDto) {
    return this.notasService.listar(query);
  }

  @Get('resumen')
  @Roles('docente', 'estudiante', 'padre')
  resumen(@Query() query: ResumenNotasQueryDto) {
    return this.notasService.resumen(query.estudiante_id, query.curso_id);
  }

  @Get('curso/:cursoId/unidad/:unidad')
  @Roles('docente', 'estudiante', 'padre')
  async porCursoYUnidad(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Param('unidad', ParseIntPipe) unidad: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.notasService.porCursoYUnidad(cursoId, unidad);
    if (resultado?.success === false) {
      res.status(400);
    }
    return resultado;
  }

  @Get('estudiante')
  @Roles('estudiante')
  misNotas(@CurrentUser() user: AuthUser) {
    return this.notasService.misNotas(user.usuario_id);
  }

  @Get('estudiante/detalladas')
  @Roles('estudiante')
  misNotasDetalladas(@CurrentUser() user: AuthUser) {
    return this.notasService.misNotasDetalladas(user.usuario_id);
  }
}
