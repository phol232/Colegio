import { Inject, Injectable } from '@nestjs/common';
import {
  IMatriculaRepository,
  MATRICULA_REPOSITORY,
} from '@/domain/ports/matricula.repository.port';
import { ok } from '@/common/dto/api-response';

@Injectable()
export class ObtenerEstadoMatriculaUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(estudianteId: number) {
    const estado = await this.matriculaRepo.getEstadoCompleto(estudianteId);
    return {
      success: true as const,
      matriculado: estado.matriculaVigente != null,
      periodo: estado.periodo,
      matricula_vigente: estado.matriculaVigente,
      solicitud_pendiente: estado.solicitudPendiente,
      propuesta: estado.propuesta,
      acciones: estado.acciones,
      info:
        estado.matriculaVigente?.grado && estado.matriculaVigente?.seccion
          ? {
              grado: estado.matriculaVigente.grado.nombre,
              seccion: estado.matriculaVigente.seccion.nombre,
            }
          : null,
    };
  }
}

@Injectable()
export class ObtenerPropuestaMatriculaUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(estudianteId: number) {
    const propuesta = await this.matriculaRepo.getPropuesta(estudianteId);
    return ok(propuesta);
  }
}

@Injectable()
export class SolicitarMatriculaUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(estudianteId: number, observaciones?: string) {
    const matricula = await this.matriculaRepo.solicitarMatricula(
      estudianteId,
      observaciones,
    );
    return ok(matricula, 'Solicitud de matrícula enviada exitosamente');
  }
}

@Injectable()
export class CancelarSolicitudMatriculaUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(estudianteId: number, matriculaId: number) {
    await this.matriculaRepo.cancelarSolicitud(estudianteId, matriculaId);
    return ok(null, 'Solicitud cancelada exitosamente');
  }
}

@Injectable()
export class ListarMatriculasAdminUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(filters: Parameters<IMatriculaRepository['listarAdmin']>[0]) {
    const result = await this.matriculaRepo.listarAdmin(filters);
    return ok(result);
  }
}

@Injectable()
export class AprobarMatriculaUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(matriculaId: number, seccionId: number, adminId: number) {
    const matricula = await this.matriculaRepo.aprobarMatricula(
      matriculaId,
      seccionId,
      adminId,
    );
    return ok(matricula, 'Matrícula aprobada y activada exitosamente');
  }
}

@Injectable()
export class RechazarMatriculaUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(
    matriculaId: number,
    adminId: number,
    observaciones?: string,
  ) {
    const matricula = await this.matriculaRepo.rechazarMatricula(
      matriculaId,
      adminId,
      observaciones,
    );
    return ok(matricula, 'Solicitud rechazada');
  }
}

@Injectable()
export class RetirarMatriculaUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(
    matriculaId: number,
    adminId: number,
    observaciones?: string,
  ) {
    const matricula = await this.matriculaRepo.retirarMatricula(
      matriculaId,
      adminId,
      observaciones,
    );
    return ok(matricula, 'Matrícula retirada');
  }
}

@Injectable()
export class ReasignarSeccionMatriculaUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(matriculaId: number, seccionId: number, adminId: number) {
    const matricula = await this.matriculaRepo.reasignarSeccion(
      matriculaId,
      seccionId,
      adminId,
    );
    return ok(matricula, 'Sección reasignada exitosamente');
  }
}

@Injectable()
export class RegistrarDecisionPromocionUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(
    input: Parameters<IMatriculaRepository['registrarDecision']>[0],
  ) {
    const decision = await this.matriculaRepo.registrarDecision(input);
    return ok(decision, 'Decisión de promoción registrada');
  }
}

@Injectable()
export class ObtenerResumenMatriculaUseCase {
  constructor(
    @Inject(MATRICULA_REPOSITORY)
    private readonly matriculaRepo: IMatriculaRepository,
  ) {}

  async execute(periodoId: number) {
    const [resumen, checklist, decisiones] = await Promise.all([
      this.matriculaRepo.getResumenPeriodo(periodoId),
      this.matriculaRepo.getChecklistPeriodo(periodoId),
      this.matriculaRepo.listarDecisionesPendientes(periodoId),
    ]);
    return ok({ resumen, checklist, decisiones });
  }
}
