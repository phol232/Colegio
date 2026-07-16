import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AttendanceBulkItem,
  AttendanceRecord,
  AttendanceStatus,
  CourseAttendanceSummary,
  IAttendanceRepository,
  ListAttendanceFilters,
  PaginatedAttendance,
} from '@/domain/ports/attendance.repository.port';
import { AttendanceCalculatorService } from '@/domain/services/attendance-calculator.service';
import { AsistenciaEntity } from '../entities/oltp/asistencia.entity';
import { OLTP_CONNECTION } from './typeorm-unit-of-work';

function mapAttendance(entity: AsistenciaEntity): AttendanceRecord {
  const fecha =
    typeof entity.fecha === 'string'
      ? entity.fecha.slice(0, 10)
      : new Date(entity.fecha).toISOString().slice(0, 10);

  return {
    id: Number(entity.id),
    estudianteId: Number(entity.estudianteId),
    cursoId: Number(entity.cursoId),
    fecha,
    estado: entity.estado as AttendanceStatus,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class TypeOrmAttendanceRepository implements IAttendanceRepository {
  constructor(
    @InjectRepository(AsistenciaEntity, OLTP_CONNECTION)
    private readonly repo: Repository<AsistenciaEntity>,
    private readonly attendanceCalculator: AttendanceCalculatorService,
  ) {}

  async bulkUpsert(
    cursoId: number,
    fecha: string,
    registros: AttendanceBulkItem[],
  ): Promise<{ success: boolean; message?: string; inserted?: number }> {
    let inserted = 0;

    await this.repo.manager.transaction(async (manager) => {
      for (const registro of registros) {
        const existing = await manager.findOne(AsistenciaEntity, {
          where: {
            estudianteId: registro.estudianteId,
            cursoId,
            fecha,
          },
        });

        if (existing) {
          existing.estado = registro.estado;
          existing.updatedAt = new Date();
          await manager.save(AsistenciaEntity, existing);
        } else {
          await manager.save(AsistenciaEntity, {
            estudianteId: registro.estudianteId,
            cursoId,
            fecha,
            estado: registro.estado,
          });
          inserted += 1;
        }
      }
    });

    return {
      success: true,
      message: 'Asistencias registradas exitosamente',
      inserted,
    };
  }

  async updateStatus(
    id: number,
    estado: AttendanceStatus,
  ): Promise<AttendanceRecord | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      return null;
    }

    entity.estado = estado;
    entity.updatedAt = new Date();
    const saved = await this.repo.save(entity);
    return mapAttendance(saved);
  }

  async list(filters: ListAttendanceFilters): Promise<PaginatedAttendance> {
    const page = Math.max(1, filters.page ?? 1);
    const perPage = Math.max(1, Math.min(100, filters.perPage ?? 15));
    const offset = (page - 1) * perPage;

    const qb = this.repo.createQueryBuilder('a');

    if (filters.estudianteId != null) {
      qb.andWhere('a.estudiante_id = :estudianteId', {
        estudianteId: filters.estudianteId,
      });
    }
    if (filters.cursoId != null) {
      qb.andWhere('a.curso_id = :cursoId', { cursoId: filters.cursoId });
    }
    if (filters.fecha) {
      qb.andWhere('a.fecha = :fecha', { fecha: filters.fecha });
    }
    if (filters.fechaInicio && filters.fechaFin) {
      qb.andWhere('a.fecha BETWEEN :inicio AND :fin', {
        inicio: filters.fechaInicio,
        fin: filters.fechaFin,
      });
    }
    if (filters.estado) {
      qb.andWhere('a.estado = :estado', { estado: filters.estado });
    }

    const total = await qb.getCount();
    const rows = await qb
      .orderBy('a.fecha', 'DESC')
      .skip(offset)
      .take(perPage)
      .getMany();

    return {
      data: rows.map(mapAttendance),
      total,
      page,
      perPage,
      lastPage: Math.max(1, Math.ceil(total / perPage) || 1),
    };
  }

  async getStudentCourseSummary(estudianteId: number, cursoId: number) {
    const rows = await this.repo.find({
      where: { estudianteId, cursoId },
    });

    const presentes = rows.filter((r) => r.estado === 'presente').length;
    const ausentes = rows.filter((r) => r.estado === 'ausente').length;
    const tardanzas = rows.filter((r) => r.estado === 'tardanza').length;
    const fechas = new Set(
      rows.map((r) =>
        typeof r.fecha === 'string'
          ? r.fecha.slice(0, 10)
          : new Date(r.fecha).toISOString().slice(0, 10),
      ),
    );

    return this.attendanceCalculator.construirResumen(
      presentes,
      ausentes,
      tardanzas,
      fechas.size,
    );
  }

  async getByCourseAndDate(
    cursoId: number,
    fecha: string,
  ): Promise<AttendanceRecord[]> {
    const rows = await this.repo.find({
      where: { cursoId, fecha },
      order: { estudianteId: 'ASC' },
    });
    return rows.map(mapAttendance);
  }

  async getByStudentMonth(
    estudianteId: number,
    mes: number,
  ): Promise<AttendanceRecord[]> {
    const rows = await this.repo
      .createQueryBuilder('a')
      .where('a.estudiante_id = :estudianteId', { estudianteId })
      .andWhere('EXTRACT(MONTH FROM a.fecha) = :mes', { mes })
      .orderBy('a.fecha', 'DESC')
      .getMany();

    return rows.map(mapAttendance);
  }

  async getByStudent(estudianteId: number): Promise<AttendanceRecord[]> {
    const rows = await this.repo.find({
      where: { estudianteId },
      order: { fecha: 'DESC' },
    });
    return rows.map(mapAttendance);
  }

  async getByStudentCourse(
    estudianteId: number,
    cursoId: number,
  ): Promise<AttendanceRecord[]> {
    const rows = await this.repo.find({
      where: { estudianteId, cursoId },
      order: { fecha: 'DESC' },
    });
    return rows.map(mapAttendance);
  }

  async getCourseSummary(cursoId: number): Promise<CourseAttendanceSummary> {
    const rows = await this.repo.find({ where: { cursoId } });

    if (rows.length === 0) {
      return {
        totalClases: 0,
        porcentajeAsistencia: 0,
        totalPresentes: 0,
        totalAusentes: 0,
        totalTardanzas: 0,
      };
    }

    const fechas = new Set(
      rows.map((r) =>
        typeof r.fecha === 'string'
          ? r.fecha.slice(0, 10)
          : new Date(r.fecha).toISOString().slice(0, 10),
      ),
    );
    const totalPresentes = rows.filter((r) => r.estado === 'presente').length;
    const totalAusentes = rows.filter((r) => r.estado === 'ausente').length;
    const totalTardanzas = rows.filter((r) => r.estado === 'tardanza').length;

    return {
      totalClases: fechas.size,
      porcentajeAsistencia: this.attendanceCalculator.calcularPorcentaje(
        totalPresentes,
        totalTardanzas,
        rows.length,
      ),
      totalPresentes,
      totalAusentes,
      totalTardanzas,
    };
  }
}
