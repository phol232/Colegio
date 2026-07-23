import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthTokenGuard } from '../../common/guards/auth-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/guards/auth-token.guard';
import { AdminService } from './admin.service';
import {
  AsignarEstudiantesSeccionDto,
  AsignarEstudianteCursoDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(AuthTokenGuard, RolesGuard)
@Roles('admin')
export class AdminEstudiantesController {
  constructor(private readonly adminService: AdminService) {}

  @Get('estudiantes')
  listarTodos() {
    return this.adminService.listarTodosEstudiantes();
  }

  @Get('estudiantes/disponibles')
  listarDisponibles() {
    return this.adminService.listarEstudiantesDisponibles();
  }

  @Get('docentes')
  listarDocentes() {
    return this.adminService.listarDocentes();
  }

  @Get('secciones/:seccionId/estudiantes')
  listarSeccion(@Param('seccionId', ParseIntPipe) seccionId: number) {
    return this.adminService.listarEstudiantesSeccion(seccionId);
  }

  @Post('secciones/:seccionId/asignar-estudiantes')
  @HttpCode(200)
  asignarSeccion(
    @CurrentUser() user: AuthUser,
    @Param('seccionId', ParseIntPipe) seccionId: number,
    @Body() dto: AsignarEstudiantesSeccionDto,
  ) {
    return this.adminService.asignarEstudiantesSeccion(
      seccionId,
      dto,
      user.usuario_id,
    );
  }

  @Post('cursos/:cursoId/estudiantes')
  @HttpCode(200)
  asignarCurso(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Body() dto: AsignarEstudianteCursoDto,
  ) {
    return this.adminService.asignarEstudianteCurso(cursoId, dto);
  }
}
