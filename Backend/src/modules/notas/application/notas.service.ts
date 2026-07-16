import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GRADE_REPOSITORY,
  IGradeRepository,
} from '@/domain/ports/grade.repository.port';
import { ok } from '@/common/dto/api-response';
import { PromedioUnidadEntity } from '@/infrastructure/typeorm/entities/oltp/promedio-unidad.entity';
import { EstudianteCursoEntity } from '@/infrastructure/typeorm/entities/oltp/estudiante-curso.entity';
import { NotaDetalleEntity } from '@/infrastructure/typeorm/entities/oltp/nota-detalle.entity';
import { OLTP_CONNECTION } from '@/infrastructure/typeorm/repositories';
import { CrearNotaLegacyDto } from '../dto/crear-nota-legacy.dto';
import { ActualizarNotaLegacyDto } from '../dto/actualizar-nota-legacy.dto';
import { ListarNotasQueryDto } from '../dto/listar-notas.query.dto';

@Injectable()
export class NotasService {
  constructor(
    @Inject(GRADE_REPOSITORY)
    private readonly gradeRepository: IGradeRepository,
    @InjectRepository(PromedioUnidadEntity, OLTP_CONNECTION)
    private readonly promedioRepo: Repository<PromedioUnidadEntity>,
    @InjectRepository(EstudianteCursoEntity, OLTP_CONNECTION)
    private readonly estudianteCursoRepo: Repository<EstudianteCursoEntity>,
  ) {}

  private validatePuntaje(puntaje: number) {
    if (puntaje < 0 || puntaje > 20) {
      return {
        success: false,
        message: 'El puntaje debe estar entre 0 y 20',
      };
    }
    return null;
  }

  async registrar(dto: CrearNotaLegacyDto) {
    const puntajeError = this.validatePuntaje(dto.puntaje);
    if (puntajeError) {
      return puntajeError;
    }

    if (dto.unidad < 1 || dto.unidad > 4) {
      return {
        success: false,
        message: 'La unidad debe estar entre 1 y 4',
      };
    }

    try {
      const nota = await this.gradeRepository.createNotaLegacy(
        dto.estudiante_id,
        dto.curso_id,
        dto.unidad,
        dto.puntaje,
      );

      return {
        success: true,
        message: 'Nota registrada exitosamente',
        data: {
          id: nota.id,
          estudiante_id: nota.estudianteId,
          curso_id: nota.cursoId,
          unidad: nota.unidad,
          puntaje: nota.puntaje,
          created_at: nota.createdAt,
          updated_at: nota.updatedAt,
        },
      };
    } catch (e: unknown) {
      return {
        success: false,
        message:
          'Error al registrar nota: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  async actualizar(_id: number, dto: ActualizarNotaLegacyDto) {
    const puntajeError = this.validatePuntaje(dto.puntaje);
    if (puntajeError) {
      return puntajeError;
    }

    try {
      const existing = await this.gradeRepository.listNotasLegacy({
        estudianteId: dto.estudiante_id,
        cursoId: dto.curso_id,
        unidad: dto.unidad,
      });

      if (existing.length === 0) {
        return { success: false, message: 'Nota no encontrada' };
      }

      const nota = await this.gradeRepository.updateNotaLegacy(
        existing[0].id,
        dto.puntaje,
      );

      return {
        success: true,
        message: 'Nota actualizada exitosamente',
        data: {
          id: nota.id,
          estudiante_id: nota.estudianteId,
          curso_id: nota.cursoId,
          unidad: nota.unidad,
          puntaje: nota.puntaje,
          updated_at: nota.updatedAt,
        },
      };
    } catch (e: unknown) {
      return {
        success: false,
        message:
          'Error al actualizar nota: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  async listar(query: ListarNotasQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.max(1, Math.min(100, query.per_page ?? 15));
    const offset = (page - 1) * perPage;

    const qb = this.promedioRepo
      .createQueryBuilder('pu')
      .innerJoin('pu.estudiante', 'u')
      .innerJoin('pu.curso', 'c')
      .leftJoin('c.cursoCatalogo', 'cc');

    if (query.estudiante_id != null) {
      qb.andWhere('pu.estudiante_id = :estudianteId', {
        estudianteId: query.estudiante_id,
      });
    }
    if (query.curso_id != null) {
      qb.andWhere('pu.curso_id = :cursoId', { cursoId: query.curso_id });
    }
    if (query.unidad != null) {
      qb.andWhere('pu.unidad = :unidad', { unidad: query.unidad });
    }

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'pu.id AS id',
        'pu.estudiante_id AS estudiante_id',
        'pu.curso_id AS curso_id',
        'pu.unidad AS unidad',
        'pu.promedio_numerico AS puntaje',
        'pu.promedio_literal AS puntaje_literal',
        'pu.total_evaluaciones AS total_evaluaciones',
        'pu.created_at AS created_at',
        'pu.updated_at AS updated_at',
        `json_build_object('id', u.id, 'name', u.name, 'email', u.email) AS estudiante`,
        `json_build_object('id', c.id, 'nombre', cc.nombre, 'codigo', cc.codigo) AS curso`,
      ])
      .orderBy('pu.updated_at', 'DESC')
      .offset(offset)
      .limit(perPage)
      .getRawMany();

    const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);

    return ok({
      current_page: page,
      data: rows,
      per_page: perPage,
      total,
      last_page: lastPage,
      from: total === 0 ? null : offset + 1,
      to: total === 0 ? null : Math.min(offset + perPage, total),
    });
  }

  async resumen(estudianteId: number, cursoId: number) {
    const promedios = await this.gradeRepository.listPromediosByEstudianteCurso(
      estudianteId,
      cursoId,
    );

    const avg =
      promedios.length > 0
        ? promedios.reduce((sum, p) => sum + Number(p.promedioNumerico), 0) /
          promedios.length
        : 0;

    const byUnidad = (u: number) => {
      const row = promedios.find((p) => Number(p.unidad) === u);
      return row ? Number(row.promedioNumerico) : null;
    };

    return ok({
      promedio_general: Math.round(avg * 100) / 100,
      unidad_1: byUnidad(1),
      unidad_2: byUnidad(2),
      unidad_3: byUnidad(3),
      unidad_4: byUnidad(4),
      total_notas: promedios.length,
    });
  }

  async porCursoYUnidad(cursoId: number, unidad: number) {
    if (unidad < 1 || unidad > 4) {
      return {
        success: false,
        message: 'La unidad debe estar entre 1 y 4',
      };
    }

    try {
      const enriched = await this.enrichPromediosCursoUnidad(cursoId, unidad);

      return {
        success: true,
        data: enriched,
      };
    } catch (e: unknown) {
      return {
        success: false,
        message:
          'Error al obtener notas: ' +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  private async enrichPromediosCursoUnidad(cursoId: number, unidad: number) {
    const rows = await this.promedioRepo
      .createQueryBuilder('pu')
      .innerJoin('pu.estudiante', 'u')
      .where('pu.curso_id = :cursoId', { cursoId })
      .andWhere('pu.unidad = :unidad', { unidad })
      .select([
        'pu.estudiante_id AS estudiante_id',
        'u.name AS estudiante_nombre',
        'u.email AS estudiante_email',
        'pu.promedio_numerico AS promedio_numerico',
        'pu.promedio_literal AS promedio_literal',
        'pu.total_evaluaciones AS total_evaluaciones',
        'pu.updated_at AS updated_at',
      ])
      .orderBy('u.name', 'ASC')
      .getRawMany();

    return rows.map((item) => ({
      id: item.estudiante_id,
      estudiante_id: item.estudiante_id,
      estudiante_nombre: item.estudiante_nombre,
      estudiante_email: item.estudiante_email,
      puntaje: item.promedio_numerico,
      puntaje_literal: item.promedio_literal,
      total_evaluaciones: item.total_evaluaciones,
      updated_at: item.updated_at,
    }));
  }

  async misNotas(estudianteId: number) {
    try {
      const rows = await this.estudianteCursoRepo
        .createQueryBuilder('ec')
        .innerJoin('ec.curso', 'c')
        .innerJoin('c.cursoCatalogo', 'cc')
        .innerJoin('c.evaluaciones', 'e')
        .innerJoin(
          NotaDetalleEntity,
          'nd',
          'nd.evaluacion_id = e.id AND nd.estudiante_id = :estudianteId',
          { estudianteId },
        )
        .where('ec.estudiante_id = :estudianteId', { estudianteId })
        .select([
          'c.id AS curso_id',
          'cc.nombre AS curso_nombre',
          'AVG(nd.puntaje)::numeric(5,2) AS promedio_numerico',
          `CASE
             WHEN AVG(nd.puntaje) >= 18 THEN 'AD'
             WHEN AVG(nd.puntaje) >= 14 THEN 'A'
             WHEN AVG(nd.puntaje) >= 11 THEN 'B'
             ELSE 'C'
           END AS promedio_literal`,
          'COUNT(DISTINCT e.id)::bigint AS total_evaluaciones',
        ])
        .groupBy('c.id')
        .addGroupBy('cc.nombre')
        .having('COUNT(nd.id) > 0')
        .orderBy('cc.nombre', 'ASC')
        .getRawMany();

      return ok(rows);
    } catch {
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al obtener notas',
      });
    }
  }

  async misNotasDetalladas(estudianteId: number) {
    try {
      const rows = await this.estudianteCursoRepo
        .createQueryBuilder('ec')
        .innerJoin('ec.curso', 'c')
        .innerJoin('c.cursoCatalogo', 'cc')
        .leftJoin('c.evaluaciones', 'e')
        .leftJoin(
          NotaDetalleEntity,
          'nd',
          'nd.evaluacion_id = e.id AND nd.estudiante_id = :estudianteId',
          { estudianteId },
        )
        .where('ec.estudiante_id = :estudianteId', { estudianteId })
        .select([
          'c.id AS curso_id',
          'cc.nombre AS curso_nombre',
          'cc.codigo AS curso_codigo',
          'COALESCE(AVG(nd.puntaje), 0)::numeric(5,2) AS promedio_numerico',
          `CASE
             WHEN AVG(nd.puntaje) >= 18 THEN 'AD'
             WHEN AVG(nd.puntaje) >= 14 THEN 'A'
             WHEN AVG(nd.puntaje) >= 11 THEN 'B'
             ELSE 'C'
           END AS promedio_literal`,
          `COALESCE(
             json_agg(
               json_build_object(
                 'id', e.id,
                 'nombre', e.nombre,
                 'tipo_evaluacion', e.tipo_evaluacion,
                 'mes', e.mes,
                 'puntaje', nd.puntaje,
                 'peso', e.peso
               ) ORDER BY e.mes, e.orden
             ) FILTER (WHERE e.id IS NOT NULL),
             '[]'::json
           ) AS evaluaciones`,
        ])
        .groupBy('c.id')
        .addGroupBy('cc.nombre')
        .addGroupBy('cc.codigo')
        .orderBy('cc.nombre', 'ASC')
        .getRawMany();

      const data = rows.map((nota) => ({
        curso_id: nota.curso_id,
        curso_nombre: nota.curso_nombre,
        curso_codigo: nota.curso_codigo,
        promedio_numerico: Number(nota.promedio_numerico),
        promedio_literal: nota.promedio_literal,
        evaluaciones:
          typeof nota.evaluaciones === 'string'
            ? JSON.parse(nota.evaluaciones)
            : nota.evaluaciones,
      }));

      return ok(data);
    } catch {
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al obtener notas detalladas',
      });
    }
  }
}
