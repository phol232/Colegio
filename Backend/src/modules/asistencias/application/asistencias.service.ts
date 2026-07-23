import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  ATTENDANCE_REPOSITORY,
  AttendanceRecord,
  AttendanceStatus,
  IAttendanceRepository,
} from '@/domain/ports/attendance.repository.port';
import { CacheService } from '../../../common/redis/cache.service';
import { ok } from '../../../common/dto/api-response';
import { RegistrarAsistenciaMasivaDto } from '../dto/registrar-asistencia.dto';
import { ListarAsistenciasQueryDto } from '../dto/listar-asistencias.query.dto';

function mapAttendanceRow(record: AttendanceRecord) {
  return {
    id: record.id,
    estudiante_id: record.estudianteId,
    curso_id: record.cursoId,
    fecha: record.fecha,
    estado: record.estado,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

@Injectable()
export class AsistenciasService {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: IAttendanceRepository,
    private readonly cache: CacheService,
  ) {}

  async registrarMasiva(dto: RegistrarAsistenciaMasivaDto) {
    try {
      const response = await this.attendanceRepo.bulkUpsert(
        dto.curso_id,
        dto.fecha,
        dto.registros.map((registro) => ({
          estudianteId: registro.estudiante_id,
          estado: registro.estado as AttendanceStatus,
        })),
      );

      if (response.success) {
        for (const registro of dto.registros) {
          await this.invalidarCacheEstudiante(registro.estudiante_id);
        }
        await this.cache.del(
          `asistencia:curso:${dto.curso_id}:fecha:${dto.fecha}`,
        );
      }

      return response;
    } catch (e: any) {
      return {
        success: false,
        message: 'Error al registrar asistencia: ' + e.message,
      };
    }
  }

  async actualizar(id: number, estado: string) {
    try {
      const asistencia = await this.attendanceRepo.updateStatus(
        id,
        estado as AttendanceStatus,
      );

      if (!asistencia) {
        return {
          success: false,
          message: 'Asistencia no encontrada',
        };
      }

      await this.invalidarCacheEstudiante(asistencia.estudianteId);
      await this.cache.del(
        `asistencia:curso:${asistencia.cursoId}:fecha:${asistencia.fecha}`,
      );

      return {
        success: true,
        message: 'Asistencia actualizada exitosamente',
        data: mapAttendanceRow(asistencia),
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'Error al actualizar asistencia: ' + e.message,
      };
    }
  }

  async listar(query: ListarAsistenciasQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.max(1, Math.min(100, query.per_page ?? 15));
    const offset = (page - 1) * perPage;

    const result = await this.attendanceRepo.list({
      estudianteId: query.estudiante_id,
      cursoId: query.curso_id,
      fecha: query.fecha,
      fechaInicio: query.fecha_inicio,
      fechaFin: query.fecha_fin,
      estado: query.estado as AttendanceStatus | undefined,
      page,
      perPage,
    });

    const total = result.total;

    return ok({
      current_page: page,
      data: result.data.map(mapAttendanceRow),
      per_page: perPage,
      total,
      last_page: result.lastPage,
      from: total === 0 ? null : offset + 1,
      to: total === 0 ? null : Math.min(offset + perPage, total),
    });
  }

  async resumen(estudianteId: number, cursoId: number) {
    try {
      const data = await this.attendanceRepo.getStudentCourseSummary(
        estudianteId,
        cursoId,
      );
      return ok(data);
    } catch {
      return ok({
        total_clases: 0,
        presentes: 0,
        ausentes: 0,
        tardanzas: 0,
        porcentaje: 0,
      });
    }
  }

  async resumenCurso(cursoId: number) {
    try {
      const summary = await this.attendanceRepo.getCourseSummary(cursoId);

      return ok({
        total_clases: summary.totalClases,
        porcentaje_asistencia: summary.porcentajeAsistencia,
        total_presentes: summary.totalPresentes,
        total_ausentes: summary.totalAusentes,
        total_tardanzas: summary.totalTardanzas,
      });
    } catch (e: any) {
      throw new InternalServerErrorException({
        success: false,
        message:
          'Error al obtener resumen de asistencias: ' + e.message,
      });
    }
  }

  async porCursoYFecha(cursoId: number, fecha: string) {
    const cacheKey = `asistencia:curso:${cursoId}:fecha:${fecha}`;
    return this.cache.remember(cacheKey, 3600, async () => {
      try {
        const asistencias = await this.attendanceRepo.getByCourseAndDate(
          cursoId,
          fecha,
        );

        return {
          success: true,
          data: asistencias.map(mapAttendanceRow),
        };
      } catch (e: any) {
        return {
          success: false,
          message: 'Error al obtener asistencias: ' + e.message,
        };
      }
    });
  }

  async misAsistencias(estudianteId: number, mes?: number) {
    try {
      const cacheKey =
        mes != null
          ? `asistencia:estudiante:${estudianteId}:resumen:mes:${mes}`
          : `asistencia:estudiante:${estudianteId}:resumen:all`;

      const resumen = await this.cache.remember(cacheKey, 3600, async () => {
        return this.attendanceRepo.getStudentCourseSummaries(estudianteId, mes);
      });

      return ok(resumen);
    } catch {
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al obtener asistencias',
      });
    }
  }

  async misAsistenciasPorCurso(estudianteId: number, cursoId: number) {
    try {
      const cacheKey = `asistencia:estudiante:${estudianteId}:curso:${cursoId}:detalle`;
      const asistencias = await this.cache.remember(cacheKey, 3600, async () => {
        const rows = await this.attendanceRepo.getByStudentCourse(
          estudianteId,
          cursoId,
        );
        return rows.map((row) => ({
          id: row.id,
          fecha: row.fecha,
          estado: row.estado,
        }));
      });
      return ok(asistencias);
    } catch {
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al obtener detalle de asistencias',
      });
    }
  }

  private async invalidarCacheEstudiante(estudianteId: number) {
    const asistencias = await this.attendanceRepo.getByStudent(estudianteId);
    const cursoIds = [...new Set(asistencias.map((a) => a.cursoId))];

    for (const cursoId of cursoIds) {
      await this.cache.del(
        `asistencia:estudiante:${estudianteId}:curso:${cursoId}`,
      );
      await this.cache.del(
        `asistencia:estudiante:${estudianteId}:curso:${cursoId}:detalle`,
      );
    }
    await this.cache.delByPattern(`asistencia:estudiante:${estudianteId}:*`);
  }
}
