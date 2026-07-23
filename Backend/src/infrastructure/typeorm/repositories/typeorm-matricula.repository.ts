import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import {
  EstadoMatriculaCompleto,
  IMatriculaRepository,
  ListarMatriculasFilters,
  ListarMatriculasResult,
  MatriculaRecord,
  PeriodoRecord,
  PropuestaMatricula,
  RegistrarDecisionInput,
  DecisionPromocionRecord,
} from '@/domain/ports/matricula.repository.port';
import { MatriculaEligibilityService } from '@/domain/services/matricula-eligibility.service';
import { IUnitOfWork } from '@/domain/ports/unit-of-work.port';
import { UNIT_OF_WORK } from '@/domain/ports/tokens';
import { Inject } from '@nestjs/common';
import { ConfiguracionSistemaEntity } from '../entities/oltp/configuracion-sistema.entity';
import { PeriodoAcademicoEntity } from '../entities/oltp/periodo-academico.entity';
import { MatriculaEntity } from '../entities/oltp/matricula.entity';
import { DecisionPromocionEntity } from '../entities/oltp/decision-promocion.entity';
import { GradoEntity } from '../entities/oltp/grado.entity';
import { SeccionEntity } from '../entities/oltp/seccion.entity';
import { CursoEntity } from '../entities/oltp/curso.entity';
import { EstudianteCursoEntity } from '../entities/oltp/estudiante-curso.entity';
import { UsuarioEntity } from '../entities/oltp/usuario.entity';
import { OLTP_CONNECTION } from './typeorm-unit-of-work';

function mapPeriodo(entity: PeriodoAcademicoEntity): PeriodoRecord {
  return {
    id: Number(entity.id),
    anio: entity.anio,
    estado: entity.estado,
    matriculaInicio: entity.matriculaInicio,
    matriculaFin: entity.matriculaFin,
  };
}

function mapMatricula(
  entity: MatriculaEntity,
  extras?: Partial<MatriculaRecord>,
): MatriculaRecord {
  return {
    id: Number(entity.id),
    estudianteId: Number(entity.estudianteId),
    periodoAcademicoId: Number(entity.periodoAcademicoId),
    gradoId: Number(entity.gradoId),
    seccionId: entity.seccionId != null ? Number(entity.seccionId) : null,
    estado: entity.estado,
    tipo: entity.tipo,
    origen: entity.origen,
    observaciones: entity.observaciones,
    solicitadoPor: entity.solicitadoPor != null ? Number(entity.solicitadoPor) : null,
    confirmadoPor: entity.confirmadoPor != null ? Number(entity.confirmadoPor) : null,
    confirmadoAt: entity.confirmadoAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    grado: entity.grado
      ? {
          id: Number(entity.grado.id),
          nombre: entity.grado.nombre,
          nivel: entity.grado.nivel,
          numero: entity.grado.numero,
        }
      : extras?.grado,
    seccion: entity.seccion
      ? {
          id: Number(entity.seccion.id),
          gradoId: Number(entity.seccion.gradoId),
          nombre: entity.seccion.nombre,
          capacidad: entity.seccion.capacidad,
        }
      : extras?.seccion ?? null,
    ...extras,
  };
}

@Injectable()
export class TypeOrmMatriculaRepository implements IMatriculaRepository {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @InjectRepository(ConfiguracionSistemaEntity, OLTP_CONNECTION)
    private readonly configRepo: Repository<ConfiguracionSistemaEntity>,
    @InjectRepository(PeriodoAcademicoEntity, OLTP_CONNECTION)
    private readonly periodoRepo: Repository<PeriodoAcademicoEntity>,
    @InjectRepository(MatriculaEntity, OLTP_CONNECTION)
    private readonly matriculaRepo: Repository<MatriculaEntity>,
    @InjectRepository(DecisionPromocionEntity, OLTP_CONNECTION)
    private readonly decisionRepo: Repository<DecisionPromocionEntity>,
    @InjectRepository(GradoEntity, OLTP_CONNECTION)
    private readonly gradoRepo: Repository<GradoEntity>,
    @InjectRepository(SeccionEntity, OLTP_CONNECTION)
    private readonly seccionRepo: Repository<SeccionEntity>,
    @InjectRepository(CursoEntity, OLTP_CONNECTION)
    private readonly cursoRepo: Repository<CursoEntity>,
    @InjectRepository(EstudianteCursoEntity, OLTP_CONNECTION)
    private readonly estudianteCursoRepo: Repository<EstudianteCursoEntity>,
    @InjectRepository(UsuarioEntity, OLTP_CONNECTION)
    private readonly userRepo: Repository<UsuarioEntity>,
    private readonly eligibility: MatriculaEligibilityService,
  ) {}

  async getPeriodoActivo(): Promise<PeriodoRecord | null> {
    const config = await this.configRepo.findOne({ where: {} });
    if (!config?.periodoAcademicoActivoId) {
      if (!config?.anioAcademico) return null;
      const periodo = await this.periodoRepo.findOne({
        where: { anio: config.anioAcademico },
      });
      return periodo ? mapPeriodo(periodo) : null;
    }
    const periodo = await this.periodoRepo.findOne({
      where: { id: config.periodoAcademicoActivoId },
    });
    return periodo ? mapPeriodo(periodo) : null;
  }

  async getPeriodoById(id: number): Promise<PeriodoRecord | null> {
    const periodo = await this.periodoRepo.findOne({ where: { id } });
    return periodo ? mapPeriodo(periodo) : null;
  }

  async getGradoIngresoId(): Promise<number | null> {
    const config = await this.configRepo.findOne({ where: {} });
    return config?.gradoIngresoId != null ? Number(config.gradoIngresoId) : null;
  }

  async getEstadoCompleto(estudianteId: number): Promise<EstadoMatriculaCompleto> {
    const propuesta = await this.getPropuesta(estudianteId);
    const periodo = propuesta.periodo;

    let matriculaVigente: MatriculaRecord | null = null;
    let solicitudPendiente: MatriculaRecord | null = null;

    if (periodo) {
      const matriculas = await this.matriculaRepo.find({
        where: { estudianteId, periodoAcademicoId: periodo.id },
        relations: ['grado', 'seccion'],
      });
      const activa = matriculas.find((m) => m.estado === 'activa');
      matriculaVigente = activa ? mapMatricula(activa) : null;
      const pendiente = matriculas.find((m) => m.estado === 'pendiente');
      solicitudPendiente = pendiente ? mapMatricula(pendiente) : null;
    }

    return {
      periodo,
      matriculaVigente,
      solicitudPendiente,
      propuesta,
      acciones: {
        puedeSolicitar: propuesta.puedeSolicitar,
        puedeCancelar: solicitudPendiente != null,
      },
    };
  }

  async getPropuesta(estudianteId: number): Promise<PropuestaMatricula> {
    const periodo = await this.getPeriodoActivo();
    const gradoIngresoId = await this.getGradoIngresoId();
    const grados = await this.gradoRepo.find({
      order: { nivel: 'ASC', numero: 'ASC' },
    });

    let matriculaAnterior: MatriculaEntity | null = null;
    let decisionAnterior: DecisionPromocionEntity | null = null;
    let solicitudActual: MatriculaEntity | null = null;
    let matriculaActiva: MatriculaEntity | null = null;

    if (periodo) {
      const actuales = await this.matriculaRepo.find({
        where: { estudianteId, periodoAcademicoId: periodo.id },
      });
      solicitudActual = actuales.find((m) => m.estado === 'pendiente') ?? null;
      matriculaActiva = actuales.find((m) => m.estado === 'activa') ?? null;

      const periodosAnteriores = await this.periodoRepo
        .createQueryBuilder('p')
        .where('p.anio < :anio', { anio: periodo.anio })
        .orderBy('p.anio', 'DESC')
        .getMany();

      for (const p of periodosAnteriores) {
        const prev = await this.matriculaRepo.findOne({
          where: {
            estudianteId,
            periodoAcademicoId: p.id,
            estado: 'activa',
          },
          relations: ['grado'],
        });
        if (prev) {
          matriculaAnterior = prev;
          decisionAnterior = await this.decisionRepo.findOne({
            where: { matriculaOrigenId: prev.id },
          });
          break;
        }
      }
    }

    const propuesta = this.eligibility.calcularPropuesta({
      periodo,
      gradoIngresoId,
      matriculaAnterior,
      decisionAnterior,
      solicitudActual,
      matriculaActiva,
      grados,
    });

    if (propuesta.gradoPropuesto) {
      propuesta.seccionesDisponibles = await this.getSeccionesConCupos(
        propuesta.gradoPropuesto.id,
        periodo?.id,
      );
    }

    return propuesta;
  }

  async solicitarMatricula(
    estudianteId: number,
    observaciones?: string,
  ): Promise<MatriculaRecord> {
    const propuesta = await this.getPropuesta(estudianteId);
    if (!propuesta.puedeSolicitar || !propuesta.periodo || !propuesta.gradoPropuesto || !propuesta.tipoPropuesto) {
      throw new BadRequestException(
        propuesta.motivoBloqueo ?? 'No puedes solicitar matrícula en este momento',
      );
    }

    const existing = await this.matriculaRepo.findOne({
      where: {
        estudianteId,
        periodoAcademicoId: propuesta.periodo.id,
      },
    });
    if (existing) {
      if (existing.estado === 'pendiente') {
        throw new ConflictException('Ya tienes una solicitud pendiente');
      }
      if (existing.estado === 'activa') {
        throw new ConflictException('Ya tienes matrícula activa');
      }
      if (existing.estado === 'rechazada') {
        await this.matriculaRepo.update(existing.id, {
          estado: 'pendiente',
          gradoId: propuesta.gradoPropuesto.id,
          tipo: propuesta.tipoPropuesto,
          seccionId: null,
          observaciones: observaciones ?? null,
          solicitadoPor: estudianteId,
          confirmadoPor: null,
          confirmadoAt: null,
          updatedAt: new Date(),
        });
        const updated = await this.matriculaRepo.findOneOrFail({
          where: { id: existing.id },
          relations: ['grado', 'seccion'],
        });
        return mapMatricula(updated);
      }
    }

    const entity = await this.matriculaRepo.save({
      estudianteId,
      periodoAcademicoId: propuesta.periodo.id,
      gradoId: propuesta.gradoPropuesto.id,
      seccionId: null,
      estado: 'pendiente',
      tipo: propuesta.tipoPropuesto,
      origen: 'estudiante',
      observaciones: observaciones ?? null,
      solicitadoPor: estudianteId,
    });

    const saved = await this.matriculaRepo.findOneOrFail({
      where: { id: entity.id },
      relations: ['grado', 'seccion'],
    });
    return mapMatricula(saved);
  }

  async cancelarSolicitud(estudianteId: number, matriculaId: number): Promise<void> {
    const matricula = await this.matriculaRepo.findOne({
      where: { id: matriculaId, estudianteId },
    });
    if (!matricula) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (matricula.estado !== 'pendiente') {
      throw new BadRequestException('Solo puedes cancelar solicitudes pendientes');
    }
    await this.matriculaRepo.delete(matriculaId);
  }

  async listarAdmin(filters: ListarMatriculasFilters): Promise<ListarMatriculasResult> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.matriculaRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.grado', 'g')
      .leftJoinAndSelect('m.seccion', 's')
      .leftJoinAndSelect('m.periodoAcademico', 'p')
      .leftJoinAndSelect('m.estudiante', 'u');

    if (filters.periodoId) {
      qb.andWhere('m.periodo_academico_id = :periodoId', {
        periodoId: filters.periodoId,
      });
    }
    if (filters.estado) {
      qb.andWhere('m.estado = :estado', { estado: filters.estado });
    }
    if (filters.gradoId) {
      qb.andWhere('m.grado_id = :gradoId', { gradoId: filters.gradoId });
    }
    if (filters.seccionId) {
      qb.andWhere('m.seccion_id = :seccionId', { seccionId: filters.seccionId });
    }
    if (filters.busqueda?.trim()) {
      const q = `%${filters.busqueda.trim()}%`;
      qb.andWhere(
        '(u.name ILIKE :q OR u.email ILIKE :q OR u.dni ILIKE :q)',
        { q },
      );
    }

    const [rows, total] = await qb
      .orderBy('m.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const items = rows.map((m) =>
      mapMatricula(m, {
        periodoAnio: m.periodoAcademico?.anio,
        estudianteNombre: m.estudiante?.name,
        estudianteEmail: m.estudiante?.email,
        estudianteDni: m.estudiante?.dni,
      }),
    );

    return { items, total, page, limit };
  }

  async aprobarMatricula(
    matriculaId: number,
    seccionId: number,
    adminId: number,
  ): Promise<MatriculaRecord> {
    return this.unitOfWork.transaction(async (manager) =>
      this.aprobarMatriculaWithManager(manager, matriculaId, seccionId, adminId),
    );
  }

  async rechazarMatricula(
    matriculaId: number,
    adminId: number,
    observaciones?: string,
  ): Promise<MatriculaRecord> {
    const matricula = await this.matriculaRepo.findOne({
      where: { id: matriculaId },
      relations: ['grado', 'seccion'],
    });
    if (!matricula) throw new NotFoundException('Matrícula no encontrada');
    if (matricula.estado !== 'pendiente') {
      throw new BadRequestException('Solo se pueden rechazar solicitudes pendientes');
    }
    matricula.estado = 'rechazada';
    matricula.confirmadoPor = adminId;
    matricula.confirmadoAt = new Date();
    matricula.observaciones = observaciones ?? matricula.observaciones;
    matricula.updatedAt = new Date();
    const saved = await this.matriculaRepo.save(matricula);
    return mapMatricula(saved);
  }

  async retirarMatricula(
    matriculaId: number,
    adminId: number,
    observaciones?: string,
  ): Promise<MatriculaRecord> {
    return this.unitOfWork.transaction(async (manager) =>
      this.retirarMatriculaWithManager(manager, matriculaId, adminId, observaciones),
    );
  }

  async reasignarSeccion(
    matriculaId: number,
    seccionId: number,
    adminId: number,
  ): Promise<MatriculaRecord> {
    return this.unitOfWork.transaction(async (manager) =>
      this.reasignarSeccionWithManager(manager, matriculaId, seccionId, adminId),
    );
  }

  async registrarDecision(
    input: RegistrarDecisionInput,
  ): Promise<DecisionPromocionRecord> {
    const matricula = await this.matriculaRepo.findOne({
      where: { id: input.matriculaOrigenId, estado: 'activa' },
      relations: ['grado'],
    });
    if (!matricula) {
      throw new NotFoundException('Matrícula de origen no encontrada o no activa');
    }

    const grados = await this.gradoRepo.find();
    let gradoDestinoId = input.gradoDestinoId ?? null;
    if (input.resultado === 'promovido' && gradoDestinoId == null && matricula.grado) {
      gradoDestinoId = this.eligibility.calcularGradoDestinoPromocion(
        matricula.grado,
        grados,
        input.resultado,
      );
    }
    if (input.resultado === 'repite' && gradoDestinoId == null) {
      gradoDestinoId = Number(matricula.gradoId);
    }

    const existing = await this.decisionRepo.findOne({
      where: { matriculaOrigenId: input.matriculaOrigenId },
    });

    const payload = {
      matriculaOrigenId: input.matriculaOrigenId,
      resultado: input.resultado,
      gradoDestinoId,
      motivo: input.motivo ?? null,
      registradoPor: input.registradoPor,
      updatedAt: new Date(),
    };

    const saved = existing
      ? await this.decisionRepo.save({ ...existing, ...payload })
      : await this.decisionRepo.save(payload);

    return {
      id: Number(saved.id),
      matriculaOrigenId: Number(saved.matriculaOrigenId),
      resultado: saved.resultado,
      gradoDestinoId: saved.gradoDestinoId != null ? Number(saved.gradoDestinoId) : null,
      motivo: saved.motivo,
      registradoPor: saved.registradoPor != null ? Number(saved.registradoPor) : null,
    };
  }

  async listarDecisionesPendientes(periodoId: number) {
    const matriculas = await this.matriculaRepo.find({
      where: { periodoAcademicoId: periodoId, estado: 'activa' },
      relations: ['grado', 'seccion', 'estudiante', 'periodoAcademico'],
    });

    const result: Array<{
      matricula: MatriculaRecord;
      decision: DecisionPromocionRecord | null;
    }> = [];
    for (const m of matriculas) {
      const decision = await this.decisionRepo.findOne({
        where: { matriculaOrigenId: m.id },
      });
      result.push({
        matricula: mapMatricula(m, {
          estudianteNombre: m.estudiante?.name,
          estudianteEmail: m.estudiante?.email,
          estudianteDni: m.estudiante?.dni,
          periodoAnio: m.periodoAcademico?.anio,
        }),
        decision: decision
          ? {
              id: Number(decision.id),
              matriculaOrigenId: Number(decision.matriculaOrigenId),
              resultado: decision.resultado,
              gradoDestinoId:
                decision.gradoDestinoId != null
                  ? Number(decision.gradoDestinoId)
                  : null,
              motivo: decision.motivo,
              registradoPor:
                decision.registradoPor != null
                  ? Number(decision.registradoPor)
                  : null,
            }
          : null,
      });
    }
    return result;
  }

  async getResumenPeriodo(periodoId: number) {
    const rows = await this.matriculaRepo
      .createQueryBuilder('m')
      .select('m.estado', 'estado')
      .addSelect('COUNT(*)', 'count')
      .where('m.periodo_academico_id = :periodoId', { periodoId })
      .groupBy('m.estado')
      .getRawMany<{ estado: string; count: string }>();

    const counts = Object.fromEntries(
      rows.map((r) => [r.estado, Number(r.count)]),
    );

    const sinSeccion = await this.matriculaRepo.count({
      where: {
        periodoAcademicoId: periodoId,
        estado: 'pendiente',
        seccionId: IsNull(),
      },
    });

    return {
      pendientes: counts.pendiente ?? 0,
      activas: counts.activa ?? 0,
      rechazadas: counts.rechazada ?? 0,
      retiradas: counts.retirada ?? 0,
      sinSeccion,
    };
  }

  async getChecklistPeriodo(periodoId: number) {
    const periodo = await this.periodoRepo.findOne({ where: { id: periodoId } });
    const gradosCount = await this.gradoRepo.count();
    const seccionesCount = await this.seccionRepo.count();
    const cursosCount = await this.cursoRepo.count({
      where: { periodoAcademicoId: periodoId },
    });
    const pendientes = await this.listarDecisionesPendientes(periodoId);
    const decisionesPendientes = pendientes.filter((p) => !p.decision).length;

    const ventanaAbierta =
      periodo?.estado === 'matricula' &&
      this.isVentanaAbierta(mapPeriodo(periodo));

    return {
      gradosConfigurados: gradosCount > 0,
      seccionesConfiguradas: seccionesCount > 0,
      cursosAsignados: cursosCount > 0,
      ventanaAbierta,
      decisionesPendientes,
    };
  }

  async getEnrollmentState(estudianteId: number) {
    const estado = await this.getEstadoCompleto(estudianteId);
    const activa = estado.matriculaVigente;
    if (activa) {
      return {
        matriculado: true,
        gradoId: activa.gradoId,
        seccionId: activa.seccionId,
        gradoNombre: activa.grado?.nombre ?? null,
        seccionNombre: activa.seccion?.nombre ?? null,
      };
    }
    if (estado.solicitudPendiente) {
      return {
        matriculado: false,
        gradoId: estado.solicitudPendiente.gradoId,
        seccionId: null,
        gradoNombre: estado.solicitudPendiente.grado?.nombre ?? null,
        seccionNombre: null,
      };
    }
    return { matriculado: false };
  }

  async assignStudentToCourse(
    estudianteId: number,
    cursoId: number,
    anioAcademico: number,
  ): Promise<void> {
    const periodo = await this.periodoRepo.findOne({ where: { anio: anioAcademico } });
    const matricula = periodo
      ? await this.matriculaRepo.findOne({
          where: {
            estudianteId,
            periodoAcademicoId: periodo.id,
            estado: 'activa',
          },
        })
      : null;

    const fecha = new Date().toISOString().slice(0, 10);
    const existing = await this.estudianteCursoRepo.findOne({
      where: { estudianteId, cursoId, anioAcademico },
    });
    if (existing) {
      if (matricula) {
        existing.matriculaId = matricula.id;
        await this.estudianteCursoRepo.save(existing);
      }
      return;
    }
    await this.estudianteCursoRepo.save({
      estudianteId,
      cursoId,
      matriculaId: matricula?.id ?? null,
      fechaMatricula: fecha,
      anioAcademico,
    });
  }

  async assignStudentsToSeccionLegacy(
    seccionId: number,
    estudianteIds: number[],
    adminId: number,
  ): Promise<void> {
    const uniqueIds = [...new Set(estudianteIds.map((id) => Number(id)))];

    await this.unitOfWork.transaction(async (manager) => {
      const seccion = await manager.findOneOrFail(SeccionEntity, {
        where: { id: seccionId },
      });
      const periodo = await this.getPeriodoActivo();
      if (!periodo) {
        throw new BadRequestException('No hay período académico activo');
      }

      const cursos = await manager.find(CursoEntity, {
        where: {
          gradoId: Number(seccion.gradoId),
          seccionId,
          periodoAcademicoId: periodo.id,
        },
      });
      if (uniqueIds.length > 0 && cursos.length === 0) {
        throw new BadRequestException(
          'La sección no tiene cursos asignados para este período',
        );
      }

      if (uniqueIds.length > seccion.capacidad) {
        throw new BadRequestException('La sección no tiene vacantes disponibles');
      }

      const actuales = await manager.find(MatriculaEntity, {
        where: {
          seccionId,
          periodoAcademicoId: periodo.id,
          estado: 'activa',
        },
      });

      const desiredSet = new Set(uniqueIds);
      for (const matricula of actuales) {
        if (!desiredSet.has(Number(matricula.estudianteId))) {
          await this.retirarMatriculaWithManager(manager, Number(matricula.id), adminId);
        }
      }

      for (const estudianteId of uniqueIds) {
        await this.syncEstudianteEnSeccionWithManager(
          manager,
          estudianteId,
          seccion,
          periodo,
          adminId,
        );
      }
    });
  }

  async reconcileEstudianteCursosForMatricula(matriculaId: number): Promise<void> {
    await this.unitOfWork.transaction(async (manager) => {
      await this.reconcileEstudianteCursosForMatriculaWithManager(manager, matriculaId);
    });
  }

  async reconcileActiveMatriculasForSeccion(
    seccionId: number,
    periodoAcademicoId: number,
  ): Promise<void> {
    await this.unitOfWork.transaction(async (manager) => {
      const matriculas = await manager.find(MatriculaEntity, {
        where: {
          seccionId,
          periodoAcademicoId,
          estado: 'activa',
        },
      });
      for (const matricula of matriculas) {
        await this.reconcileEstudianteCursosForMatriculaWithManager(
          manager,
          Number(matricula.id),
        );
      }
    });
  }

  private async aprobarMatriculaWithManager(
    manager: EntityManager,
    matriculaId: number,
    seccionId: number,
    adminId: number,
  ): Promise<MatriculaRecord> {
    const matricula = await manager.findOne(MatriculaEntity, {
      where: { id: matriculaId },
      relations: ['periodoAcademico'],
    });
    if (!matricula) {
      throw new NotFoundException('Matrícula no encontrada');
    }
    if (matricula.estado !== 'pendiente') {
      throw new BadRequestException('Solo se pueden aprobar solicitudes pendientes');
    }

    const seccion = await manager.findOne(SeccionEntity, {
      where: { id: seccionId, gradoId: matricula.gradoId },
    });
    if (!seccion) {
      throw new BadRequestException('Sección no válida para el grado solicitado');
    }

    await this.validarCupo(manager, seccionId, matricula.periodoAcademicoId);

    const cursos = await manager.find(CursoEntity, {
      where: {
        gradoId: matricula.gradoId,
        seccionId,
        periodoAcademicoId: matricula.periodoAcademicoId,
      },
    });
    if (cursos.length === 0) {
      throw new BadRequestException(
        'La sección no tiene cursos asignados para este período',
      );
    }

    matricula.estado = 'activa';
    matricula.seccionId = seccionId;
    matricula.confirmadoPor = adminId;
    matricula.confirmadoAt = new Date();
    matricula.updatedAt = new Date();
    await manager.save(MatriculaEntity, matricula);

    await manager.update(UsuarioEntity, matricula.estudianteId, {
      gradoId: matricula.gradoId,
      seccionId,
      updatedAt: new Date(),
    });

    await this.reconcileEstudianteCursosForMatriculaWithManager(manager, matriculaId);

    const saved = await manager.findOneOrFail(MatriculaEntity, {
      where: { id: matriculaId },
      relations: ['grado', 'seccion', 'periodoAcademico'],
    });
    return mapMatricula(saved, { periodoAnio: saved.periodoAcademico?.anio });
  }

  private async reasignarSeccionWithManager(
    manager: EntityManager,
    matriculaId: number,
    seccionId: number,
    adminId: number,
  ): Promise<MatriculaRecord> {
    const matricula = await manager.findOne(MatriculaEntity, {
      where: { id: matriculaId },
      relations: ['periodoAcademico'],
    });
    if (!matricula) throw new NotFoundException('Matrícula no encontrada');
    if (matricula.estado !== 'activa') {
      throw new BadRequestException('Solo se puede reasignar matrículas activas');
    }

    const seccion = await manager.findOne(SeccionEntity, {
      where: { id: seccionId, gradoId: matricula.gradoId },
    });
    if (!seccion) {
      throw new BadRequestException('Sección no válida para el grado');
    }

    await this.validarCupo(
      manager,
      seccionId,
      matricula.periodoAcademicoId,
      matriculaId,
    );

    matricula.seccionId = seccionId;
    matricula.confirmadoPor = adminId;
    matricula.updatedAt = new Date();
    await manager.save(MatriculaEntity, matricula);

    await manager.update(UsuarioEntity, matricula.estudianteId, {
      seccionId,
      updatedAt: new Date(),
    });

    await this.reconcileEstudianteCursosForMatriculaWithManager(manager, matriculaId);

    const saved = await manager.findOneOrFail(MatriculaEntity, {
      where: { id: matriculaId },
      relations: ['grado', 'seccion', 'periodoAcademico'],
    });
    return mapMatricula(saved, { periodoAnio: saved.periodoAcademico?.anio });
  }

  private async retirarMatriculaWithManager(
    manager: EntityManager,
    matriculaId: number,
    adminId: number,
    observaciones?: string,
  ): Promise<MatriculaRecord> {
    const matricula = await manager.findOne(MatriculaEntity, {
      where: { id: matriculaId },
      relations: ['periodoAcademico', 'grado', 'seccion'],
    });
    if (!matricula) throw new NotFoundException('Matrícula no encontrada');
    if (matricula.estado !== 'activa') {
      throw new BadRequestException('Solo se pueden retirar matrículas activas');
    }

    matricula.estado = 'retirada';
    matricula.confirmadoPor = adminId;
    matricula.confirmadoAt = new Date();
    matricula.observaciones = observaciones ?? matricula.observaciones;
    matricula.updatedAt = new Date();
    await manager.save(MatriculaEntity, matricula);

    await manager
      .createQueryBuilder()
      .delete()
      .from(EstudianteCursoEntity)
      .where('estudiante_id = :estudianteId', {
        estudianteId: matricula.estudianteId,
      })
      .andWhere('matricula_id = :matriculaId', { matriculaId })
      .execute();

    await manager.update(UsuarioEntity, matricula.estudianteId, {
      gradoId: null,
      seccionId: null,
      updatedAt: new Date(),
    });

    return mapMatricula(matricula, {
      periodoAnio: matricula.periodoAcademico?.anio,
    });
  }

  private async syncEstudianteEnSeccionWithManager(
    manager: EntityManager,
    estudianteId: number,
    seccion: SeccionEntity,
    periodo: PeriodoRecord,
    adminId: number,
  ): Promise<void> {
    const gradoId = Number(seccion.gradoId);
    let matricula = await manager.findOne(MatriculaEntity, {
      where: {
        estudianteId,
        periodoAcademicoId: periodo.id,
      },
    });

    if (!matricula) {
      const propuesta = await this.getPropuesta(estudianteId);
      matricula = await manager.save(MatriculaEntity, {
        estudianteId,
        periodoAcademicoId: periodo.id,
        gradoId,
        seccionId: null,
        estado: 'pendiente',
        tipo: propuesta.tipoPropuesto ?? 'continuidad',
        origen: 'admin',
        solicitadoPor: adminId,
      });
    } else if (
      matricula.estado === 'rechazada' ||
      matricula.estado === 'retirada'
    ) {
      await manager.update(MatriculaEntity, matricula.id, {
        estado: 'pendiente',
        gradoId,
        seccionId: null,
        origen: 'admin',
        solicitadoPor: adminId,
        confirmadoPor: null,
        confirmadoAt: null,
        updatedAt: new Date(),
      });
      matricula = await manager.findOneOrFail(MatriculaEntity, {
        where: { id: matricula.id },
      });
    } else if (Number(matricula.gradoId) !== gradoId) {
      throw new BadRequestException(
        'El estudiante tiene matrícula en otro grado para este período',
      );
    }

    if (matricula.estado === 'pendiente') {
      await this.aprobarMatriculaWithManager(
        manager,
        Number(matricula.id),
        Number(seccion.id),
        adminId,
      );
      return;
    }

    if (matricula.estado === 'activa') {
      if (Number(matricula.seccionId) !== Number(seccion.id)) {
        await this.reasignarSeccionWithManager(
          manager,
          Number(matricula.id),
          Number(seccion.id),
          adminId,
        );
      } else {
        await this.reconcileEstudianteCursosForMatriculaWithManager(
          manager,
          Number(matricula.id),
        );
      }
    }
  }

  private async reconcileEstudianteCursosForMatriculaWithManager(
    manager: EntityManager,
    matriculaId: number,
  ): Promise<void> {
    const matricula = await manager.findOne(MatriculaEntity, {
      where: { id: matriculaId },
      relations: ['periodoAcademico'],
    });
    if (
      !matricula ||
      matricula.estado !== 'activa' ||
      matricula.seccionId == null
    ) {
      return;
    }

    const cursos = await manager.find(CursoEntity, {
      where: {
        gradoId: matricula.gradoId,
        seccionId: matricula.seccionId,
        periodoAcademicoId: matricula.periodoAcademicoId,
      },
    });

    const anio = matricula.periodoAcademico?.anio ?? new Date().getFullYear();
    const fecha = new Date().toISOString().slice(0, 10);
    const expectedCursoIds = new Set(cursos.map((c) => Number(c.id)));

    for (const curso of cursos) {
      const existing = await manager.findOne(EstudianteCursoEntity, {
        where: {
          estudianteId: matricula.estudianteId,
          cursoId: curso.id,
          anioAcademico: anio,
        },
      });
      if (existing) {
        existing.matriculaId = matricula.id;
        await manager.save(EstudianteCursoEntity, existing);
      } else {
        await manager.save(EstudianteCursoEntity, {
          estudianteId: matricula.estudianteId,
          cursoId: curso.id,
          matriculaId: matricula.id,
          fechaMatricula: fecha,
          anioAcademico: anio,
        });
      }
    }

    const links = await manager.find(EstudianteCursoEntity, {
      where: { matriculaId: matricula.id },
    });
    for (const link of links) {
      if (!expectedCursoIds.has(Number(link.cursoId))) {
        await manager.delete(EstudianteCursoEntity, link.id);
      }
    }
  }

  private isVentanaAbierta(periodo: PeriodoRecord): boolean {
    if (!periodo.matriculaInicio && !periodo.matriculaFin) {
      return true;
    }
    const hoy = new Date().toISOString().slice(0, 10);
    if (periodo.matriculaInicio && hoy < periodo.matriculaInicio) {
      return false;
    }
    if (periodo.matriculaFin && hoy > periodo.matriculaFin) {
      return false;
    }
    return true;
  }

  private async getSeccionesConCupos(gradoId: number, periodoId?: number) {
    const secciones = await this.seccionRepo.find({
      where: { gradoId },
      order: { nombre: 'ASC' },
    });

    const result: Array<{
      id: number;
      gradoId: number;
      nombre: string;
      capacidad: number;
      matriculados: number;
    }> = [];
    for (const seccion of secciones) {
      const matriculados = periodoId
        ? await this.matriculaRepo.count({
            where: {
              seccionId: seccion.id,
              periodoAcademicoId: periodoId,
              estado: 'activa',
            },
          })
        : 0;
      result.push({
        id: Number(seccion.id),
        gradoId: Number(seccion.gradoId),
        nombre: seccion.nombre,
        capacidad: seccion.capacidad,
        matriculados,
      });
    }
    return result;
  }

  private async validarCupo(
    manager: EntityManager,
    seccionId: number,
    periodoId: number,
    excludeMatriculaId?: number,
  ) {
    const seccion = await manager.findOneOrFail(SeccionEntity, {
      where: { id: seccionId },
    });
    const qb = manager
      .createQueryBuilder(MatriculaEntity, 'm')
      .where('m.seccion_id = :seccionId', { seccionId })
      .andWhere('m.periodo_academico_id = :periodoId', { periodoId })
      .andWhere("m.estado = 'activa'");
    if (excludeMatriculaId) {
      qb.andWhere('m.id != :excludeMatriculaId', { excludeMatriculaId });
    }
    const count = await qb.getCount();
    if (count >= seccion.capacidad) {
      throw new BadRequestException('La sección no tiene vacantes disponibles');
    }
  }
}
