import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { MatriculaController } from './presentation/matricula.controller';
import { AdminMatriculasController } from './presentation/admin-matriculas.controller';
import {
  AprobarMatriculaUseCase,
  CancelarSolicitudMatriculaUseCase,
  ListarMatriculasAdminUseCase,
  ObtenerEstadoMatriculaUseCase,
  ObtenerPropuestaMatriculaUseCase,
  ObtenerResumenMatriculaUseCase,
  ReasignarSeccionMatriculaUseCase,
  RechazarMatriculaUseCase,
  RegistrarDecisionPromocionUseCase,
  RetirarMatriculaUseCase,
  SolicitarMatriculaUseCase,
} from './application/matricula.use-cases';
import { MatricularUseCase } from './application/matricular.use-case';
import { ObtenerOpcionesMatriculaUseCase } from './application/obtener-opciones.use-case';

@Module({
  imports: [CommonModule],
  controllers: [MatriculaController, AdminMatriculasController],
  providers: [
    ObtenerEstadoMatriculaUseCase,
    ObtenerPropuestaMatriculaUseCase,
    SolicitarMatriculaUseCase,
    CancelarSolicitudMatriculaUseCase,
    ListarMatriculasAdminUseCase,
    AprobarMatriculaUseCase,
    RechazarMatriculaUseCase,
    RetirarMatriculaUseCase,
    ReasignarSeccionMatriculaUseCase,
    RegistrarDecisionPromocionUseCase,
    ObtenerResumenMatriculaUseCase,
    MatricularUseCase,
    ObtenerOpcionesMatriculaUseCase,
  ],
})
export class MatriculaModule {}
