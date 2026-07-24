import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ok } from '../../../common/dto/api-response';
import { CursoEntity } from '@/infrastructure/typeorm/entities/oltp/curso.entity';
import { EstudianteCursoEntity } from '@/infrastructure/typeorm/entities/oltp/estudiante-curso.entity';
import { OLTP_CONNECTION } from '@/infrastructure/typeorm/repositories/typeorm-unit-of-work';

interface CursoBaseRow {
  curso_id: number;
  curso_nombre: string;
  curso_codigo: string;
  grado: string;
  seccion: string;
  anio: number | null;
}

interface StatsAggRow {
  curso_id: string | number;
  total_estudiantes?: string | number;
  promedio_curso?: string | number | null;
  estudiantes_aprobados?: string | number;
  evaluaciones_creadas?: string | number;
  total_asistencias?: string | number;
  presentes_tardanzas?: string | number;
}

@Injectable()
export class DocenteService {
  private readonly logger = new Logger(DocenteService.name);

  constructor(
    @InjectRepository(CursoEntity, OLTP_CONNECTION)
    private readonly cursoRepo: Repository<CursoEntity>,
    @InjectRepository(EstudianteCursoEntity, OLTP_CONNECTION)
    private readonly estudianteCursoRepo: Repository<EstudianteCursoEntity>,
    @InjectDataSource(OLTP_CONNECTION)
    private readonly dataSource: DataSource,
  ) {}

  async misCursos(docenteId: number) {
    try {
      const cursos = await this.cursoRepo
        .createQueryBuilder('c')
        .innerJoin('c.cursoCatalogo', 'cc')
        .leftJoin('c.seccion', 's')
        .leftJoin('c.grado', 'g')
        .leftJoin('s.grado', 'sg')
        .select([
          'c.id AS id',
          'cc.nombre AS nombre',
          'cc.codigo AS codigo',
          "COALESCE(g.nombre, sg.nombre, 'Sin grado') AS grado",
          "COALESCE(s.nombre, 'Sin sección') AS seccion",
          'c.seccion_id AS seccion_id',
        ])
        .where('c.docente_id = :docenteId', { docenteId })
        .orderBy('grado', 'ASC')
        .addOrderBy('seccion', 'ASC')
        .addOrderBy('cc.nombre', 'ASC')
        .getRawMany();

      return ok(cursos);
    } catch (error) {
      this.logger.error(
        `Error al obtener cursos del docente ${docenteId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al obtener cursos',
      });
    }
  }

  async dashboard(docenteId: number) {
    try {
      const cursosBase = await this.cursoRepo
        .createQueryBuilder('c')
        .innerJoin('c.cursoCatalogo', 'cc')
        .leftJoin('c.seccion', 's')
        .leftJoin('c.grado', 'g')
        .leftJoin('s.grado', 'sg')
        .leftJoin('c.periodoAcademico', 'p')
        .select([
          'c.id AS curso_id',
          'cc.nombre AS curso_nombre',
          'cc.codigo AS curso_codigo',
          "COALESCE(g.nombre, sg.nombre, 'Sin grado') AS grado",
          "COALESCE(s.nombre, 'Sin sección') AS seccion",
          'p.anio AS anio',
        ])
        .where('c.docente_id = :docenteId', { docenteId })
        .orderBy('cc.nombre', 'ASC')
        .getRawMany<CursoBaseRow>();

      const cursoIds = cursosBase.map((c) => Number(c.curso_id));
      if (cursoIds.length === 0) {
        return ok({
          cursos: [],
          estadisticas: [],
          total_estudiantes_unicos: 0,
        });
      }

      const [estudiantesRows, promediosRows, evaluacionesRows, asistenciaRows] =
        await Promise.all([
          this.dataSource.query(
            `
            SELECT
              ec.curso_id,
              COUNT(DISTINCT ec.estudiante_id)::int AS total_estudiantes
            FROM estudiantes_cursos ec
            INNER JOIN matriculas m
              ON m.id = ec.matricula_id AND m.estado = 'activa'
            INNER JOIN cursos c ON c.id = ec.curso_id
            LEFT JOIN periodos_academicos p ON p.id = c.periodo_academico_id
            WHERE ec.curso_id = ANY($1::bigint[])
              AND (p.anio IS NULL OR ec.anio_academico = p.anio)
            GROUP BY ec.curso_id
            `,
            [cursoIds],
          ) as Promise<StatsAggRow[]>,
          this.dataSource.query(
            `
            SELECT
              pu.curso_id,
              ROUND(AVG(pu.promedio_numerico)::numeric, 2) AS promedio_curso,
              COUNT(*) FILTER (WHERE pu.promedio_numerico >= 11)::int AS estudiantes_aprobados
            FROM (
              SELECT
                estudiante_id,
                curso_id,
                AVG(promedio_numerico) AS promedio_numerico
              FROM promedios_unidad
              WHERE curso_id = ANY($1::bigint[])
              GROUP BY estudiante_id, curso_id
            ) pu
            GROUP BY pu.curso_id
            `,
            [cursoIds],
          ) as Promise<StatsAggRow[]>,
          this.dataSource.query(
            `
            SELECT
              curso_id,
              COUNT(*)::int AS evaluaciones_creadas
            FROM evaluaciones
            WHERE curso_id = ANY($1::bigint[])
            GROUP BY curso_id
            `,
            [cursoIds],
          ) as Promise<StatsAggRow[]>,
          this.dataSource.query(
            `
            SELECT
              curso_id,
              COUNT(*)::int AS total_asistencias,
              SUM(
                CASE WHEN estado IN ('presente', 'tardanza') THEN 1 ELSE 0 END
              )::int AS presentes_tardanzas
            FROM asistencias
            WHERE curso_id = ANY($1::bigint[])
            GROUP BY curso_id
            `,
            [cursoIds],
          ) as Promise<StatsAggRow[]>,
        ]);

      const estudiantesMap = new Map(
        estudiantesRows.map((r) => [
          Number(r.curso_id),
          Number(r.total_estudiantes ?? 0),
        ]),
      );
      const promediosMap = new Map(
        promediosRows.map((r) => [
          Number(r.curso_id),
          {
            promedio: Number(r.promedio_curso ?? 0),
            aprobados: Number(r.estudiantes_aprobados ?? 0),
          },
        ]),
      );
      const evaluacionesMap = new Map(
        evaluacionesRows.map((r) => [
          Number(r.curso_id),
          Number(r.evaluaciones_creadas ?? 0),
        ]),
      );
      const asistenciaMap = new Map(
        asistenciaRows.map((r) => {
          const total = Number(r.total_asistencias ?? 0);
          const presentes = Number(r.presentes_tardanzas ?? 0);
          const pct =
            total > 0
              ? Math.round((presentes / total) * 10000) / 100
              : 0;
          return [Number(r.curso_id), pct];
        }),
      );

      const uniqueRow = await this.dataSource.query(
        `
        SELECT COUNT(DISTINCT ec.estudiante_id)::int AS total
        FROM estudiantes_cursos ec
        INNER JOIN matriculas m
          ON m.id = ec.matricula_id AND m.estado = 'activa'
        INNER JOIN cursos c ON c.id = ec.curso_id
        LEFT JOIN periodos_academicos p ON p.id = c.periodo_academico_id
        WHERE c.docente_id = $1
          AND (p.anio IS NULL OR ec.anio_academico = p.anio)
        `,
        [docenteId],
      );

      const cursos = cursosBase.map((curso) => {
        const id = Number(curso.curso_id);
        return {
          id,
          nombre: curso.curso_nombre,
          codigo: curso.curso_codigo,
          grado: curso.grado,
          seccion: curso.seccion,
          total_estudiantes: estudiantesMap.get(id) ?? 0,
        };
      });

      const estadisticasCursos = cursosBase.map((curso) => {
        const id = Number(curso.curso_id);
        const prom = promediosMap.get(id);
        return {
          curso_id: id,
          curso_nombre: curso.curso_nombre,
          curso_codigo: curso.curso_codigo,
          grado: curso.grado,
          seccion: curso.seccion,
          total_estudiantes: estudiantesMap.get(id) ?? 0,
          promedio_curso: prom?.promedio ?? 0,
          asistencia_promedio: asistenciaMap.get(id) ?? 0,
          estudiantes_aprobados: prom?.aprobados ?? 0,
          evaluaciones_creadas: evaluacionesMap.get(id) ?? 0,
        };
      });

      return ok({
        cursos,
        estadisticas: estadisticasCursos,
        total_estudiantes_unicos: Number(uniqueRow?.[0]?.total ?? 0),
      });
    } catch (error) {
      this.logger.error(
        `Error al obtener dashboard del docente ${docenteId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al obtener datos del dashboard',
      });
    }
  }

  async estudiantesCurso(cursoId: number, docenteId: number) {
    try {
      const curso = await this.cursoRepo.findOne({
        where: { id: cursoId },
        relations: ['periodoAcademico'],
      });
      if (!curso || Number(curso.docenteId) !== docenteId) {
        throw new ForbiddenException({
          success: false,
          message: 'No tienes acceso a este curso',
        });
      }

      const anio =
        curso.periodoAcademico?.anio ??
        (
          await this.dataSource
            .createQueryBuilder()
            .select('p.anio', 'anio')
            .from('periodos_academicos', 'p')
            .where('p.id = :id', { id: curso.periodoAcademicoId })
            .getRawOne<{ anio: number }>()
        )?.anio;

      const estudiantesQb = this.estudianteCursoRepo
        .createQueryBuilder('ec')
        .innerJoin('ec.estudiante', 'u')
        .innerJoin(
          'matriculas',
          'm',
          'm.id = ec.matricula_id AND m.estado = :estadoActiva',
          { estadoActiva: 'activa' },
        )
        .select(['u.id AS id', 'u.name AS name', 'u.email AS email'])
        .where('ec.curso_id = :cursoId', { cursoId });

      if (anio != null) {
        estudiantesQb.andWhere('ec.anio_academico = :anio', { anio });
      }

      const estudiantes = await estudiantesQb
        .orderBy('u.name', 'ASC')
        .getRawMany();

      return ok(estudiantes);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener estudiantes del curso ${cursoId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al obtener estudiantes',
      });
    }
  }
}
