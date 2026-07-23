import { Injectable, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ok } from '../../../common/dto/api-response';
import { CursoEntity } from '@/infrastructure/typeorm/entities/oltp/curso.entity';
import { EstudianteCursoEntity } from '@/infrastructure/typeorm/entities/oltp/estudiante-curso.entity';
import { OLTP_CONNECTION } from '@/infrastructure/typeorm/repositories/typeorm-unit-of-work';

interface DashboardCursoRow {
  curso_id: number;
  curso_nombre: string;
  curso_codigo: string;
  grado: string;
  seccion: string;
  total_estudiantes: string | number;
  promedio_curso: string | number;
  asistencia_promedio: string | number;
  estudiantes_aprobados: string | number;
  evaluaciones_creadas: string | number;
}

@Injectable()
export class DocenteService {
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
        .innerJoin('c.seccion', 's')
        .innerJoin('s.grado', 'g')
        .select([
          'c.id AS id',
          'cc.nombre AS nombre',
          'cc.codigo AS codigo',
          'g.nombre AS grado',
          's.nombre AS seccion',
          'c.seccion_id AS seccion_id',
        ])
        .where('c.docente_id = :docenteId', { docenteId })
        .orderBy('g.nombre', 'ASC')
        .addOrderBy('s.nombre', 'ASC')
        .addOrderBy('cc.nombre', 'ASC')
        .getRawMany();

      return ok(cursos);
    } catch {
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al obtener cursos',
      });
    }
  }

  private async getEstadisticasCurso(
    cursoId: number,
  ): Promise<{
    total_estudiantes: number;
    promedio_curso: number;
    asistencia_promedio: number;
    estudiantes_aprobados: number;
    evaluaciones_creadas: number;
  }> {
    const [estudiantes, evaluaciones, notasRow, aprobadosRow, asistenciaRow] =
      await Promise.all([
        this.estudianteCursoRepo.count({ where: { cursoId } }),
        this.dataSource
          .createQueryBuilder()
          .select('COUNT(*)', 'total')
          .from('evaluaciones', 'ev')
          .where('ev.curso_id = :cursoId', { cursoId })
          .getRawOne<{ total: string }>(),
        this.dataSource
          .createQueryBuilder()
          .select('AVG(nd.puntaje)', 'promedio')
          .from('notas_detalle', 'nd')
          .innerJoin('evaluaciones', 'e', 'nd.evaluacion_id = e.id')
          .where('e.curso_id = :cursoId', { cursoId })
          .getRawOne<{ promedio: string | null }>(),
        this.dataSource
          .createQueryBuilder()
          .select('COUNT(*)', 'total')
          .from((qb) => {
            return qb
              .select('nd.estudiante_id', 'estudiante_id')
              .addSelect('AVG(nd.puntaje)', 'promedio')
              .from('notas_detalle', 'nd')
              .innerJoin('evaluaciones', 'e', 'nd.evaluacion_id = e.id')
              .where('e.curso_id = :cursoId', { cursoId })
              .groupBy('nd.estudiante_id')
              .having('AVG(nd.puntaje) >= 11');
          }, 'aprobados')
          .getRawOne<{ total: string }>(),
        this.dataSource
          .createQueryBuilder()
          .select('COUNT(*)', 'total')
          .addSelect(
            "SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END)",
            'presentes',
          )
          .addSelect(
            "SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END)",
            'tardanzas',
          )
          .from('asistencias', 'a')
          .where('a.curso_id = :cursoId', { cursoId })
          .getRawOne<{ total: string; presentes: string; tardanzas: string }>(),
      ]);

    const asistenciaTotal = Number(asistenciaRow?.total ?? 0);
    const asistenciaPromedio =
      asistenciaTotal > 0
        ? Math.round(
            ((Number(asistenciaRow?.presentes ?? 0) +
              Number(asistenciaRow?.tardanzas ?? 0)) /
              asistenciaTotal) *
              100 *
              100,
          ) / 100
        : 0;

    return {
      total_estudiantes: estudiantes,
      promedio_curso: Math.round(Number(notasRow?.promedio ?? 0) * 100) / 100,
      asistencia_promedio: asistenciaPromedio,
      estudiantes_aprobados: Number(aprobadosRow?.total ?? 0),
      evaluaciones_creadas: Number(evaluaciones?.total ?? 0),
    };
  }

  async dashboard(docenteId: number) {
    try {
      const cursosBase = await this.cursoRepo
        .createQueryBuilder('c')
        .innerJoin('c.cursoCatalogo', 'cc')
        .innerJoin('c.seccion', 's')
        .innerJoin('s.grado', 'g')
        .select([
          'c.id AS curso_id',
          'cc.nombre AS curso_nombre',
          'cc.codigo AS curso_codigo',
          'g.nombre AS grado',
          's.nombre AS seccion',
        ])
        .where('c.docente_id = :docenteId', { docenteId })
        .orderBy('cc.nombre', 'ASC')
        .getRawMany<{
          curso_id: number;
          curso_nombre: string;
          curso_codigo: string;
          grado: string;
          seccion: string;
        }>();

      const estadisticas: DashboardCursoRow[] = await Promise.all(
        cursosBase.map(async (curso) => {
          const stats = await this.getEstadisticasCurso(Number(curso.curso_id));
          return {
            curso_id: Number(curso.curso_id),
            curso_nombre: curso.curso_nombre,
            curso_codigo: curso.curso_codigo,
            grado: curso.grado,
            seccion: curso.seccion,
            total_estudiantes: stats.total_estudiantes,
            promedio_curso: stats.promedio_curso,
            asistencia_promedio: stats.asistencia_promedio,
            estudiantes_aprobados: stats.estudiantes_aprobados,
            evaluaciones_creadas: stats.evaluaciones_creadas,
          };
        }),
      );

      const uniqueRow = await this.estudianteCursoRepo
        .createQueryBuilder('ec')
        .innerJoin('ec.curso', 'c')
        .where('c.docente_id = :docenteId', { docenteId })
        .select('COUNT(DISTINCT ec.estudiante_id)', 'total')
        .getRawOne<{ total: string }>();

      const cursos = estadisticas.map((stat) => ({
        id: stat.curso_id,
        nombre: stat.curso_nombre,
        codigo: stat.curso_codigo,
        grado: stat.grado,
        seccion: stat.seccion,
        total_estudiantes: Number(stat.total_estudiantes),
      }));

      const estadisticasCursos = estadisticas.map((stat) => ({
        curso_id: stat.curso_id,
        curso_nombre: stat.curso_nombre,
        curso_codigo: stat.curso_codigo,
        grado: stat.grado,
        seccion: stat.seccion,
        total_estudiantes: Number(stat.total_estudiantes),
        promedio_curso: Number(stat.promedio_curso),
        asistencia_promedio: Number(stat.asistencia_promedio),
        estudiantes_aprobados: Number(stat.estudiantes_aprobados),
        evaluaciones_creadas: Number(stat.evaluaciones_creadas),
      }));

      return ok({
        cursos,
        estadisticas: estadisticasCursos,
        total_estudiantes_unicos: Number(uniqueRow?.total ?? 0),
      });
    } catch {
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
        (await this.dataSource
          .createQueryBuilder()
          .select('p.anio', 'anio')
          .from('periodos_academicos', 'p')
          .where('p.id = :id', { id: curso.periodoAcademicoId })
          .getRawOne<{ anio: number }>())?.anio;

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

      const estudiantes = await estudiantesQb.orderBy('u.name', 'ASC').getRawMany();

      return ok(estudiantes);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException({
        success: false,
        message: 'Error al obtener estudiantes',
      });
    }
  }
}
