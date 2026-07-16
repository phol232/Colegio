import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthTokenGuard } from '../../common/guards/auth-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import {
  ActualizarCursoCatalogoDto,
  ActualizarDocenteCursoDto,
  AsignarCursosSeccionDto,
  CrearCursoCatalogoDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(AuthTokenGuard, RolesGuard)
@Roles('admin')
export class AdminCatalogoController {
  constructor(private readonly adminService: AdminService) {}

  @Get('catalogo-cursos')
  listarCatalogo(@Query('nivel') nivel?: string) {
    return this.adminService.listarCatalogoCursos(nivel);
  }

  @Post('catalogo-cursos')
  @HttpCode(201)
  crearCatalogo(@Body() dto: CrearCursoCatalogoDto) {
    return this.adminService.crearCursoCatalogo(dto);
  }

  @Put('catalogo-cursos/:id')
  actualizarCatalogo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCursoCatalogoDto,
  ) {
    return this.adminService.actualizarCursoCatalogo(id, dto);
  }

  @Delete('catalogo-cursos/:id')
  eliminarCatalogo(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.eliminarCursoCatalogo(id);
  }

  @Post('secciones/:seccionId/asignar-cursos')
  @HttpCode(201)
  asignarCursos(
    @Param('seccionId', ParseIntPipe) seccionId: number,
    @Body() dto: AsignarCursosSeccionDto,
  ) {
    return this.adminService.asignarCursosSeccion(seccionId, dto);
  }

  @Get('secciones/:seccionId/cursos-asignados')
  listarCursosAsignados(
    @Param('seccionId', ParseIntPipe) seccionId: number,
  ) {
    return this.adminService.listarCursosSeccion(seccionId);
  }

  @Delete('cursos-asignados/:cursoId')
  desasignarCurso(@Param('cursoId', ParseIntPipe) cursoId: number) {
    return this.adminService.desasignarCursoSeccion(cursoId);
  }

  @Put('cursos-asignados/:cursoId/docente')
  actualizarDocente(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Body() dto: ActualizarDocenteCursoDto,
  ) {
    return this.adminService.actualizarDocenteCurso(cursoId, dto);
  }
}
