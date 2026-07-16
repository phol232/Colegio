import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../../common/guards/auth-token.guard';
import { ObtenerOpcionesMatriculaUseCase } from '../application/obtener-opciones.use-case';
import { VerificarEstadoMatriculaUseCase } from '../application/verificar-estado.use-case';
import { MatricularUseCase } from '../application/matricular.use-case';
import { MatricularDto } from './dto/matricular.dto';

@Controller('matricula')
@Roles('estudiante')
export class MatriculaController {
  constructor(
    private readonly obtenerOpciones: ObtenerOpcionesMatriculaUseCase,
    private readonly verificarEstado: VerificarEstadoMatriculaUseCase,
    private readonly matricular: MatricularUseCase,
  ) {}

  @Get('opciones')
  opciones() {
    return this.obtenerOpciones.execute();
  }

  @Get('estado')
  estado(@CurrentUser() user: AuthUser) {
    return this.verificarEstado.execute(user.usuario_id);
  }

  @Post()
  crear(@CurrentUser() user: AuthUser, @Body() dto: MatricularDto) {
    return this.matricular.execute(user.usuario_id, dto);
  }
}
