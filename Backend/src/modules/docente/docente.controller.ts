import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/guards/auth-token.guard';
import { DocenteService } from './application/docente.service';

@Controller()
@UseGuards(RolesGuard)
@Roles('docente')
export class DocenteController {
  constructor(private readonly docenteService: DocenteService) {}

  @Get('docente/cursos')
  misCursos(@CurrentUser() user: AuthUser) {
    return this.docenteService.misCursos(user.usuario_id);
  }

  @Get('docente/dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.docenteService.dashboard(user.usuario_id);
  }

  @Get('cursos/:cursoId/estudiantes')
  estudiantesCurso(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.docenteService.estudiantesCurso(cursoId, user.usuario_id);
  }
}
