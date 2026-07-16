import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EnrollmentState,
  IEnrollmentRepository,
  MatriculaOptions,
  MatriculaResult,
} from '@/domain/ports/enrollment.repository.port';
import { IUnitOfWork } from '@/domain/ports/unit-of-work.port';
import { UNIT_OF_WORK } from '@/domain/ports/tokens';
import { CursoEntity } from '../entities/oltp/curso.entity';
import { EstudianteCursoEntity } from '../entities/oltp/estudiante-curso.entity';
import { GradoEntity } from '../entities/oltp/grado.entity';
import { SeccionEntity } from '../entities/oltp/seccion.entity';
import { UsuarioEntity } from '../entities/oltp/usuario.entity';
import { OLTP_CONNECTION } from './typeorm-unit-of-work';

@Injectable()
export class TypeOrmEnrollmentRepository implements IEnrollmentRepository {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @InjectRepository(GradoEntity, OLTP_CONNECTION)
    private readonly gradoRepo: Repository<GradoEntity>,
    @InjectRepository(SeccionEntity, OLTP_CONNECTION)
    private readonly seccionRepo: Repository<SeccionEntity>,
    @InjectRepository(UsuarioEntity, OLTP_CONNECTION)
    private readonly userRepo: Repository<UsuarioEntity>,
    @InjectRepository(CursoEntity, OLTP_CONNECTION)
    private readonly cursoRepo: Repository<CursoEntity>,
    @InjectRepository(EstudianteCursoEntity, OLTP_CONNECTION)
    private readonly estudianteCursoRepo: Repository<EstudianteCursoEntity>,
  ) {}

  async getMatriculaOptions(): Promise<MatriculaOptions> {
    const [grados, secciones] = await Promise.all([
      this.gradoRepo.find({ order: { nivel: 'ASC', numero: 'ASC' } }),
      this.seccionRepo.find({ order: { gradoId: 'ASC', nombre: 'ASC' } }),
    ]);

    return {
      grados: grados.map((g) => ({
        id: Number(g.id),
        nivel: g.nivel,
        numero: g.numero,
        nombre: g.nombre,
      })),
      secciones: secciones.map((s) => ({
        id: Number(s.id),
        gradoId: Number(s.gradoId),
        nombre: s.nombre,
        capacidad: s.capacidad,
      })),
    };
  }

  async getEnrollmentState(estudianteId: number): Promise<EnrollmentState> {
    const user = await this.userRepo.findOne({ where: { id: estudianteId } });
    if (!user) {
      return { matriculado: false };
    }

    let matriculado = user.gradoId != null && user.seccionId != null;
    let gradoNombre: string | null = null;
    let seccionNombre: string | null = null;

    if (matriculado && user.gradoId && user.seccionId) {
      const [grado, seccion] = await Promise.all([
        this.gradoRepo.findOne({ where: { id: user.gradoId } }),
        this.seccionRepo.findOne({ where: { id: user.seccionId } }),
      ]);
      gradoNombre = grado?.nombre ?? null;
      seccionNombre = seccion?.nombre ?? null;
    } else {
      const primerCurso = await this.estudianteCursoRepo
        .createQueryBuilder('ec')
        .innerJoin('ec.curso', 'c')
        .innerJoin('c.grado', 'g')
        .innerJoin('c.seccion', 's')
        .where('ec.estudiante_id = :estudianteId', { estudianteId })
        .select(['g.nombre AS grado', 's.nombre AS seccion'])
        .limit(1)
        .getRawOne<{ grado: string; seccion: string }>();

      if (primerCurso) {
        matriculado = true;
        gradoNombre = primerCurso.grado;
        seccionNombre = primerCurso.seccion;
      }
    }

    return {
      matriculado,
      gradoId: user.gradoId != null ? Number(user.gradoId) : null,
      seccionId: user.seccionId != null ? Number(user.seccionId) : null,
      gradoNombre,
      seccionNombre,
    };
  }

  async matricular(
    estudianteId: number,
    gradoId: number,
    seccionId: number,
  ): Promise<MatriculaResult> {
    const grado = await this.gradoRepo.findOne({ where: { id: gradoId } });
    const seccion = await this.seccionRepo.findOne({
      where: { id: seccionId, gradoId },
    });

    if (!grado || !seccion) {
      throw new Error('Grado o sección no válidos');
    }

    const now = new Date();
    const fecha = now.toISOString().slice(0, 10);
    const anio = now.getFullYear();

    const cursosAsignados = await this.unitOfWork.transaction(async (manager) => {
      await manager.update(UsuarioEntity, estudianteId, {
        gradoId,
        seccionId,
        updatedAt: new Date(),
      });

      const cursos = await manager.find(CursoEntity, {
        where: { gradoId, seccionId },
      });

      for (const curso of cursos) {
        await manager.save(EstudianteCursoEntity, {
          estudianteId,
          cursoId: curso.id,
          fechaMatricula: fecha,
          anioAcademico: anio,
        });
      }

      return cursos.length;
    });

    return {
      grado: grado.nombre,
      seccion: seccion.nombre,
      cursosAsignados,
    };
  }

  async listCourseIdsByGradoSeccion(
    gradoId: number,
    seccionId: number,
  ): Promise<number[]> {
    const cursos = await this.cursoRepo.find({
      where: { gradoId, seccionId },
      select: ['id'],
    });
    return cursos.map((c) => Number(c.id));
  }

  async assignStudentToCourse(
    estudianteId: number,
    cursoId: number,
    anioAcademico: number,
  ): Promise<void> {
    const fecha = new Date().toISOString().slice(0, 10);
    await this.estudianteCursoRepo.save({
      estudianteId,
      cursoId,
      fechaMatricula: fecha,
      anioAcademico,
    });
  }
}
