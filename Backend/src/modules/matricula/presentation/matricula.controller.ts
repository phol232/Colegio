import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthUser } from '@/common/guards/auth-token.guard';
import {
  CancelarSolicitudMatriculaUseCase,
  ObtenerEstadoMatriculaUseCase,
  ObtenerPropuestaMatriculaUseCase,
  SolicitarMatriculaUseCase,
} from '../application/matricula.use-cases';
import { SolicitarMatriculaDto } from './dto/matricula.dto';
import { MatricularUseCase } from '../application/matricular.use-case';
import { MatricularDto } from './dto/matricular.dto';
import { ObtenerOpcionesMatriculaUseCase } from '../application/obtener-opciones.use-case';

@Controller('matricula')
@Roles('estudiante')
export class MatriculaController {
  constructor(
    private readonly obtenerEstado: ObtenerEstadoMatriculaUseCase,
    private readonly obtenerPropuesta: ObtenerPropuestaMatriculaUseCase,
    private readonly solicitar: SolicitarMatriculaUseCase,
    private readonly cancelar: CancelarSolicitudMatriculaUseCase,
    private readonly matricularLegacy: MatricularUseCase,
    private readonly opcionesLegacy: ObtenerOpcionesMatriculaUseCase,
  ) {}

  @Get('estado')
  estado(@CurrentUser() user: AuthUser) {
    return this.obtenerEstado.execute(user.usuario_id);
  }

  @Get('propuesta')
  propuesta(@CurrentUser() user: AuthUser) {
    return this.obtenerPropuesta.execute(user.usuario_id);
  }

  @Post('solicitudes')
  crearSolicitud(
    @CurrentUser() user: AuthUser,
    @Body() dto: SolicitarMatriculaDto,
  ) {
    return this.solicitar.execute(user.usuario_id, dto.observaciones);
  }

  @Patch('solicitudes/:id/cancelar')
  cancelarSolicitud(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cancelar.execute(user.usuario_id, id);
  }

  /** @deprecated Usar GET /matricula/propuesta */
  @Get('opciones')
  opciones(@CurrentUser() user: AuthUser) {
    return this.opcionesLegacy.execute(user.usuario_id);
  }

  /** @deprecated Usar POST /matricula/solicitudes */
  @Post()
  crearLegacy(@CurrentUser() user: AuthUser, @Body() _dto: MatricularDto) {
    return this.solicitar.execute(user.usuario_id);
  }
}
