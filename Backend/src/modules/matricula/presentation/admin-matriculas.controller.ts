import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthUser } from '@/common/guards/auth-token.guard';
import {
  AprobarMatriculaUseCase,
  ListarMatriculasAdminUseCase,
  ObtenerResumenMatriculaUseCase,
  ReasignarSeccionMatriculaUseCase,
  RechazarMatriculaUseCase,
  RegistrarDecisionPromocionUseCase,
  RetirarMatriculaUseCase,
} from '@/modules/matricula/application/matricula.use-cases';
import {
  AprobarMatriculaDto,
  ListarMatriculasQueryDto,
  ReasignarSeccionDto,
  RechazarMatriculaDto,
  RegistrarDecisionDto,
} from '@/modules/matricula/presentation/dto/matricula.dto';
import { Inject } from '@nestjs/common';
import {
  IMatriculaRepository,
  MATRICULA_REPOSITORY,
} from '@/domain/ports/matricula.repository.port';
import { ok } from '@/common/dto/api-response';

@Controller('admin/matriculas')
@Roles('admin')
export class AdminMatriculasController {
  constructor(
    private readonly listar: ListarMatriculasAdminUseCase,
    private readonly aprobar: AprobarMatriculaUseCase,
    private readonly rechazar: RechazarMatriculaUseCase,
    private readonly retirar: RetirarMatriculaUseCase,
    private readonly reasignar: ReasignarSeccionMatriculaUseCase,
    private readonly registrarDecision: RegistrarDecisionPromocionUseCase,
    private readonly resumen: ObtenerResumenMatriculaUseCase,
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  @Get()
  listarMatriculas(@Query() query: ListarMatriculasQueryDto) {
    return this.listar.execute({
      periodoId: query.periodo_id,
      estado: query.estado,
      gradoId: query.grado_id,
      seccionId: query.seccion_id,
      busqueda: query.busqueda,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('periodo-activo')
  async periodoActivo() {
    const periodo = await this.matriculaRepo.getPeriodoActivo();
    return ok(periodo);
  }

  @Get('resumen/:periodoId')
  resumenPeriodo(@Param('periodoId', ParseIntPipe) periodoId: number) {
    return this.resumen.execute(periodoId);
  }

  @Post(':id/aprobar')
  aprobarMatricula(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprobarMatriculaDto,
  ) {
    return this.aprobar.execute(id, dto.seccion_id, user.usuario_id);
  }

  @Post(':id/rechazar')
  rechazarMatricula(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarMatriculaDto,
  ) {
    return this.rechazar.execute(id, user.usuario_id, dto.observaciones);
  }

  @Post(':id/retirar')
  retirarMatricula(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarMatriculaDto,
  ) {
    return this.retirar.execute(id, user.usuario_id, dto.observaciones);
  }

  @Patch(':id/seccion')
  reasignarSeccion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReasignarSeccionDto,
  ) {
    return this.reasignar.execute(id, dto.seccion_id, user.usuario_id);
  }

  @Post('decisiones')
  registrarDecisionPromocion(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegistrarDecisionDto,
  ) {
    return this.registrarDecision.execute({
      matriculaOrigenId: dto.matricula_origen_id,
      resultado: dto.resultado,
      gradoDestinoId: dto.grado_destino_id,
      motivo: dto.motivo,
      registradoPor: user.usuario_id,
    });
  }
}
