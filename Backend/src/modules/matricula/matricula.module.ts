import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { MatriculaController } from './presentation/matricula.controller';
import { ObtenerOpcionesMatriculaUseCase } from './application/obtener-opciones.use-case';
import { VerificarEstadoMatriculaUseCase } from './application/verificar-estado.use-case';
import { MatricularUseCase } from './application/matricular.use-case';

@Module({
  imports: [CommonModule],
  controllers: [MatriculaController],
  providers: [
    ObtenerOpcionesMatriculaUseCase,
    VerificarEstadoMatriculaUseCase,
    MatricularUseCase,
  ],
})
export class MatriculaModule {}
