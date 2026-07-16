import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ATTENDANCE_REPOSITORY,
  IAttendanceRepository,
} from '@/domain/ports/attendance.repository.port';
import {
  GRADE_REPOSITORY,
  IGradeRepository,
} from '@/domain/ports/grade.repository.port';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@/domain/ports/user.repository.port';
import { PadreEstudianteEntity } from '@/infrastructure/typeorm/entities/oltp/padre-estudiante.entity';
import { EstudianteCursoEntity } from '@/infrastructure/typeorm/entities/oltp/estudiante-curso.entity';
import { AsistenciaEntity } from '@/infrastructure/typeorm/entities/oltp/asistencia.entity';
import { PromedioUnidadEntity } from '@/infrastructure/typeorm/entities/oltp/promedio-unidad.entity';
import { OLTP_CONNECTION } from '@/infrastructure/typeorm/repositories';

@Injectable()
export class PadresService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(GRADE_REPOSITORY)
    private readonly gradeRepository: IGradeRepository,
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepository: IAttendanceRepository,
    @InjectRepository(PadreEstudianteEntity, OLTP_CONNECTION)
    private readonly padreEstudianteRepo: Repository<PadreEstudianteEntity>,
    @InjectRepository(EstudianteCursoEntity, OLTP_CONNECTION)
    private readonly estudianteCursoRepo: Repository<EstudianteCursoEntity>,
    @InjectRepository(AsistenciaEntity, OLTP_CONNECTION)
    private readonly asistenciaRepo: Repository<AsistenciaEntity>,
    @InjectRepository(PromedioUnidadEntity, OLTP_CONNECTION)
    private readonly promedioRepo: Repository<PromedioUnidadEntity>,
  ) {}

  async estaVinculado(padreId: number, estudianteId: number): Promise<boolean> {
    const row = await this.padreEstudianteRepo.findOne({
      where: { padreId, estudianteId },
    });
    return row != null;
  }

  async listarHijos(padreId: number) {
    const hijos = await this.padreEstudianteRepo
      .createQueryBuilder('pe')
      .innerJoin('pe.estudiante', 'u')
      .where('pe.padre_id = :padreId', { padreId })
      .select([
        'u.id AS id',
        'u.name AS name',
        'u.email AS email',
        'u.avatar AS avatar',
        'pe.created_at AS fecha_vinculacion',
      ])
      .orderBy('u.name', 'ASC')
      .getRawMany();

    return { success: true, data: hijos };
  }

  async cursosHijo(estudianteId: number) {
    return this.estudianteCursoRepo
      .createQueryBuilder('ec')
      .innerJoin('ec.curso', 'c')
      .innerJoin('c.cursoCatalogo', 'cc')
      .where('ec.estudiante_id = :estudianteId', { estudianteId })
      .select(['DISTINCT c.id AS id', 'cc.nombre AS nombre', 'cc.codigo AS codigo'])
      .orderBy('cc.nombre', 'ASC')
      .getRawMany<{ id: number; nombre: string; codigo: string }>();
  }

  async asistenciasHijo(
    hijoId: number,
    cursoId?: number,
    fechaInicio?: string,
    fechaFin?: string,
    conResumen = false,
  ) {
    const qb = this.asistenciaRepo
      .createQueryBuilder('a')
      .innerJoin('a.curso', 'c')
      .innerJoin('c.cursoCatalogo', 'cc')
      .where('a.estudiante_id = :hijoId', { hijoId });

    if (cursoId != null) {
      qb.andWhere('a.curso_id = :cursoId', { cursoId });
    }
    if (fechaInicio) {
      qb.andWhere('a.fecha >= :fechaInicio', { fechaInicio });
    }
    if (fechaFin) {
      qb.andWhere('a.fecha <= :fechaFin', { fechaFin });
    }

    const rows = await qb
      .select([
        'a.id AS id',
        'a.curso_id AS curso_id',
        'cc.nombre AS curso_nombre',
        'cc.codigo AS curso_codigo',
        'a.estado AS estado',
        'a.fecha AS fecha',
        'a.created_at AS created_at',
      ])
      .orderBy('a.fecha', 'DESC')
      .getRawMany();

    const resultado = { success: true, data: rows };

    if (!conResumen) {
      return resultado;
    }

    const cursos = await this.cursosHijo(hijoId);
    const resumenes: Array<{
      curso_id: number;
      curso_nombre: string;
      curso_codigo: string;
      resumen: unknown;
    }> = [];

    for (const curso of cursos) {
      const summary = await this.attendanceRepository.getStudentCourseSummary(
        hijoId,
        curso.id,
      );
      resumenes.push({
        curso_id: curso.id,
        curso_nombre: curso.nombre,
        curso_codigo: curso.codigo,
        resumen: { success: true, data: summary },
      });
    }

    return {
      success: true,
      data: resultado.data,
      resumenes,
    };
  }

  async notasHijo(
    hijoId: number,
    cursoId?: number,
    unidad?: number,
    conResumen = false,
  ) {
    const qb = this.promedioRepo
      .createQueryBuilder('pu')
      .innerJoin('pu.curso', 'c')
      .innerJoin('c.cursoCatalogo', 'cc')
      .where('pu.estudiante_id = :hijoId', { hijoId });

    if (cursoId != null) {
      qb.andWhere('pu.curso_id = :cursoId', { cursoId });
    }
    if (unidad != null) {
      qb.andWhere('pu.unidad = :unidad', { unidad });
    }

    const rows = await qb
      .select([
        'pu.id AS id',
        'pu.curso_id AS curso_id',
        'cc.nombre AS curso_nombre',
        'cc.codigo AS curso_codigo',
        'pu.unidad AS unidad',
        'pu.promedio_numerico AS puntaje',
        'pu.created_at AS created_at',
      ])
      .orderBy('pu.created_at', 'DESC')
      .getRawMany();

    const resultado = { success: true, data: rows };

    if (!conResumen) {
      return resultado;
    }

    const cursos = await this.cursosHijo(hijoId);
    const resumenes: Array<{
      curso_id: number;
      curso_nombre: string;
      curso_codigo: string;
      resumen: unknown;
    }> = [];

    for (const curso of cursos) {
      resumenes.push({
        curso_id: curso.id,
        curso_nombre: curso.nombre,
        curso_codigo: curso.codigo,
        resumen: await this.buildResumenNotas(hijoId, curso.id),
      });
    }

    return {
      success: true,
      data: resultado.data,
      resumenes,
    };
  }

  async resumenHijo(hijoId: number) {
    const hijo = await this.userRepository.findById(hijoId);
    if (!hijo) {
      return null;
    }

    const cursos = await this.cursosHijo(hijoId);
    const resumenCursos: Array<{
      curso_id: number;
      curso_nombre: string;
      curso_codigo: string;
      asistencia: unknown;
      notas: unknown;
    }> = [];

    for (const curso of cursos) {
      const [asistencia, notas] = await Promise.all([
        this.attendanceRepository
          .getStudentCourseSummary(hijoId, curso.id)
          .then((data) => ({ success: true, data })),
        this.buildResumenNotas(hijoId, curso.id),
      ]);

      resumenCursos.push({
        curso_id: curso.id,
        curso_nombre: curso.nombre,
        curso_codigo: curso.codigo,
        asistencia,
        notas,
      });
    }

    return {
      hijo: {
        id: hijo.id,
        name: hijo.name,
        email: hijo.email,
        avatar: hijo.avatar,
      },
      cursos: resumenCursos,
    };
  }

  private async buildResumenNotas(estudianteId: number, cursoId: number) {
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

    return {
      success: true,
      data: {
        promedio_general: Math.round(avg * 100) / 100,
        unidad_1: byUnidad(1),
        unidad_2: byUnidad(2),
        unidad_3: byUnidad(3),
        unidad_4: byUnidad(4),
        total_notas: promedios.length,
      },
    };
  }
}
