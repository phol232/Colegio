import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DashboardStats,
  IAdminRepository,
  SystemConfig,
} from '@/domain/ports/admin.repository.port';
import { UserRole } from '@/domain/ports/user.repository.port';
import { ConfiguracionSistemaEntity } from '../entities/oltp/configuracion-sistema.entity';
import { CursoEntity } from '../entities/oltp/curso.entity';
import { GradoEntity, NivelEducativo } from '../entities/oltp/grado.entity';
import { CursoCatalogoEntity, NivelCatalogo } from '../entities/oltp/curso-catalogo.entity';
import { SeccionEntity } from '../entities/oltp/seccion.entity';
import { UsuarioEntity } from '../entities/oltp/usuario.entity';
import { OLTP_CONNECTION } from './typeorm-unit-of-work';

@Injectable()
export class TypeOrmAdminRepository implements IAdminRepository {
  constructor(
    @InjectRepository(UsuarioEntity, OLTP_CONNECTION)
    private readonly userRepo: Repository<UsuarioEntity>,
    @InjectRepository(CursoEntity, OLTP_CONNECTION)
    private readonly cursoRepo: Repository<CursoEntity>,
    @InjectRepository(SeccionEntity, OLTP_CONNECTION)
    private readonly seccionRepo: Repository<SeccionEntity>,
    @InjectRepository(GradoEntity, OLTP_CONNECTION)
    private readonly gradoRepo: Repository<GradoEntity>,
    @InjectRepository(CursoCatalogoEntity, OLTP_CONNECTION)
    private readonly catalogoRepo: Repository<CursoCatalogoEntity>,
    @InjectRepository(ConfiguracionSistemaEntity, OLTP_CONNECTION)
    private readonly configRepo: Repository<ConfiguracionSistemaEntity>,
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalEstudiantes,
      totalDocentes,
      totalCursos,
      totalSecciones,
      estudiantesPorNivel,
      cursosPorNivel,
    ] = await Promise.all([
      this.userRepo.count({ where: { role: 'estudiante' } }),
      this.userRepo.count({ where: { role: 'docente' } }),
      this.cursoRepo.count(),
      this.seccionRepo.count(),
      this.userRepo.manager.query(
        `SELECT g.nivel, COUNT(DISTINCT u.id)::text AS total
         FROM usuarios u
         JOIN grados g ON u.grado_id = g.id
         WHERE u.role = 'estudiante'
         GROUP BY g.nivel`,
      ),
      this.cursoRepo.manager.query(
        `SELECT g.nivel, COUNT(DISTINCT c.id)::text AS total
         FROM cursos c
         JOIN secciones s ON c.seccion_id = s.id
         JOIN grados g ON s.grado_id = g.id
         GROUP BY g.nivel`,
      ),
    ]);

    const estMap = Object.fromEntries(
      estudiantesPorNivel.map((r: { nivel: string; total: string }) => [
        r.nivel,
        Number(r.total),
      ]),
    );
    const curMap = Object.fromEntries(
      cursosPorNivel.map((r: { nivel: string; total: string }) => [
        r.nivel,
        Number(r.total),
      ]),
    );

    return {
      totalEstudiantes,
      totalDocentes,
      totalCursos,
      totalSecciones,
      estudiantesPorNivel: {
        primaria: estMap.primaria ?? 0,
        secundaria: estMap.secundaria ?? 0,
      },
      cursosPorNivel: {
        primaria: curMap.primaria ?? 0,
        secundaria: curMap.secundaria ?? 0,
      },
    };
  }

  async getSeccionesInfo(): Promise<Record<string, unknown>[]> {
    return this.seccionRepo.manager.query(
      `SELECT
         s.id,
         CONCAT(g.numero, 'ro ', s.nombre) AS nombre,
         g.nivel,
         g.numero AS grado_numero,
         COALESCE(es.total_estudiantes, 0) AS estudiantes_actual,
         s.capacidad,
         ROUND((COALESCE(es.total_estudiantes, 0) * 100.0 / NULLIF(s.capacidad, 0)), 2) AS porcentaje_ocupacion,
         COALESCE(d.name, 'Sin asignar') AS docente_tutor
       FROM secciones s
       JOIN grados g ON s.grado_id = g.id
       LEFT JOIN (
         SELECT c.seccion_id, COUNT(DISTINCT ec.estudiante_id) AS total_estudiantes
         FROM cursos c
         LEFT JOIN estudiantes_cursos ec ON ec.curso_id = c.id
         GROUP BY c.seccion_id
       ) es ON s.id = es.seccion_id
       LEFT JOIN LATERAL (
         SELECT u.name
         FROM cursos c
         JOIN usuarios u ON c.docente_id = u.id
         WHERE c.seccion_id = s.id AND u.role = 'docente'
         LIMIT 1
       ) d ON TRUE
       ORDER BY g.nivel, g.numero, s.nombre`,
    );
  }

  async getConfiguracion(): Promise<SystemConfig | null> {
    const config = await this.configRepo.find({ take: 1, order: { id: 'ASC' } });
    const row = config[0];
    if (!row) return null;

    return {
      id: Number(row.id),
      nombreInstitucion: row.nombreInstitucion,
      anioAcademico: row.anioAcademico,
      periodoEvaluacion: row.periodoEvaluacion,
      modoMantenimiento: row.modoMantenimiento,
    };
  }

  async updateConfiguracion(
    input: Partial<SystemConfig>,
  ): Promise<SystemConfig> {
    const current = await this.configRepo.findOne({
      order: { id: 'ASC' },
      where: {},
    });

    if (!current) {
      const created = await this.configRepo.save({
        nombreInstitucion: input.nombreInstitucion ?? 'Colegio Frederick',
        anioAcademico: input.anioAcademico ?? new Date().getFullYear(),
        periodoEvaluacion: input.periodoEvaluacion ?? 'trimestral',
        modoMantenimiento: input.modoMantenimiento ?? false,
      });
      return {
        id: Number(created.id),
        nombreInstitucion: created.nombreInstitucion,
        anioAcademico: created.anioAcademico,
        periodoEvaluacion: created.periodoEvaluacion,
        modoMantenimiento: created.modoMantenimiento,
      };
    }

    if (input.nombreInstitucion !== undefined) {
      current.nombreInstitucion = input.nombreInstitucion;
    }
    if (input.anioAcademico !== undefined) {
      current.anioAcademico = input.anioAcademico;
    }
    if (input.periodoEvaluacion !== undefined) {
      current.periodoEvaluacion = input.periodoEvaluacion;
    }
    if (input.modoMantenimiento !== undefined) {
      current.modoMantenimiento = input.modoMantenimiento;
    }
    current.updatedAt = new Date();

    const saved = await this.configRepo.save(current);
    return {
      id: Number(saved.id),
      nombreInstitucion: saved.nombreInstitucion,
      anioAcademico: saved.anioAcademico,
      periodoEvaluacion: saved.periodoEvaluacion,
      modoMantenimiento: saved.modoMantenimiento,
    };
  }

  async listGrados(): Promise<Record<string, unknown>[]> {
    return this.gradoRepo.find({
      order: { nivel: 'ASC', numero: 'ASC' },
    }) as unknown as Record<string, unknown>[];
  }

  async createGrado(
    nivel: string,
    numero: number,
    nombre: string,
  ): Promise<Record<string, unknown>> {
    const saved = await this.gradoRepo.save({
      nivel: nivel as NivelEducativo,
      numero,
      nombre,
    });
    return saved as unknown as Record<string, unknown>;
  }

  async updateGrado(
    id: number,
    input: { nivel?: string; numero?: number; nombre?: string },
  ): Promise<Record<string, unknown>> {
    await this.gradoRepo.update(id, {
      ...(input.nivel !== undefined
        ? { nivel: input.nivel as NivelEducativo }
        : {}),
      ...(input.numero !== undefined ? { numero: input.numero } : {}),
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      updatedAt: new Date(),
    });
    return this.gradoRepo.findOneOrFail({
      where: { id },
    }) as unknown as Record<string, unknown>;
  }

  async deleteGrado(id: number): Promise<void> {
    await this.gradoRepo.delete(id);
  }

  async listSeccionesByGrado(gradoId: number): Promise<Record<string, unknown>[]> {
    return this.seccionRepo.find({
      where: { gradoId },
      order: { nombre: 'ASC' },
    }) as unknown as Record<string, unknown>[];
  }

  async createSeccion(
    gradoId: number,
    nombre: string,
    capacidad: number,
  ): Promise<Record<string, unknown>> {
    const saved = await this.seccionRepo.save({ gradoId, nombre, capacidad });
    return saved as unknown as Record<string, unknown>;
  }

  async updateSeccion(
    id: number,
    input: { nombre?: string; capacidad?: number },
  ): Promise<Record<string, unknown>> {
    await this.seccionRepo.update(id, {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.capacidad !== undefined ? { capacidad: input.capacidad } : {}),
      updatedAt: new Date(),
    });
    return this.seccionRepo.findOneOrFail({
      where: { id },
    }) as unknown as Record<string, unknown>;
  }

  async deleteSeccion(id: number): Promise<void> {
    await this.seccionRepo.delete(id);
  }

  async listAllStudents(): Promise<Record<string, unknown>[]> {
    return this.userRepo.find({
      where: { role: 'estudiante' as UserRole },
      order: { name: 'ASC' },
    }) as unknown as Record<string, unknown>[];
  }

  async listAvailableStudents(): Promise<Record<string, unknown>[]> {
    return this.userRepo.find({
      where: { role: 'estudiante' as UserRole, gradoId: null as any },
      order: { name: 'ASC' },
    }) as unknown as Record<string, unknown>[];
  }

  async listStudentsBySeccion(seccionId: number): Promise<Record<string, unknown>[]> {
    return this.userRepo.find({
      where: { role: 'estudiante' as UserRole, seccionId },
      order: { name: 'ASC' },
    }) as unknown as Record<string, unknown>[];
  }

  async assignStudentsToSeccion(
    seccionId: number,
    estudianteIds: number[],
  ): Promise<void> {
    const seccion = await this.seccionRepo.findOneOrFail({
      where: { id: seccionId },
    });

    await this.userRepo.manager.transaction(async (manager) => {
      for (const estudianteId of estudianteIds) {
        await manager.update(UsuarioEntity, estudianteId, {
          gradoId: seccion.gradoId,
          seccionId,
          updatedAt: new Date(),
        });
      }
    });
  }

  async listTeachers(): Promise<Record<string, unknown>[]> {
    return this.userRepo.find({
      where: { role: 'docente' as UserRole },
      select: ['id', 'name', 'email', 'dni'],
      order: { name: 'ASC' },
    }) as unknown as Record<string, unknown>[];
  }

  async listCatalogoCursos(nivel?: string): Promise<Record<string, unknown>[]> {
    if (nivel) {
      return this.catalogoRepo.find({
        where: [
          { nivel: nivel as NivelCatalogo },
          { nivel: 'ambos' as NivelCatalogo },
        ],
        order: { nombre: 'ASC' },
      }) as unknown as Record<string, unknown>[];
    }

    return this.catalogoRepo.find({
      order: { nombre: 'ASC' },
    }) as unknown as Record<string, unknown>[];
  }

  async createCursoCatalogo(input: {
    nombre: string;
    codigo: string;
    nivel: string;
    descripcion?: string | null;
  }): Promise<Record<string, unknown>> {
    const saved = await this.catalogoRepo.save({
      ...input,
      nivel: input.nivel as NivelCatalogo,
    });
    return saved as unknown as Record<string, unknown>;
  }

  async updateCursoCatalogo(
    id: number,
    input: {
      nombre?: string;
      codigo?: string;
      nivel?: string;
      descripcion?: string | null;
    },
  ): Promise<Record<string, unknown>> {
    await this.catalogoRepo.update(id, {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.codigo !== undefined ? { codigo: input.codigo } : {}),
      ...(input.nivel !== undefined
        ? { nivel: input.nivel as NivelCatalogo }
        : {}),
      ...(input.descripcion !== undefined
        ? { descripcion: input.descripcion }
        : {}),
      updatedAt: new Date(),
    });
    return this.catalogoRepo.findOneOrFail({
      where: { id },
    }) as unknown as Record<string, unknown>;
  }

  async deleteCursoCatalogo(id: number): Promise<void> {
    await this.catalogoRepo.delete(id);
  }

  async assignCursosSeccion(
    seccionId: number,
    docenteId: number,
    cursosCatalogoIds: number[],
  ): Promise<void> {
    const seccion = await this.seccionRepo.findOneOrFail({
      where: { id: seccionId },
    });

    await this.cursoRepo.manager.transaction(async (manager) => {
      const existing = await manager.find(CursoEntity, {
        where: { seccionId },
      });

      const keepIds = new Set(cursosCatalogoIds);

      for (const curso of existing) {
        if (curso.cursoCatalogoId && !keepIds.has(Number(curso.cursoCatalogoId))) {
          await manager.delete(CursoEntity, curso.id);
        }
      }

      for (const catalogoId of cursosCatalogoIds) {
        const found = existing.find(
          (c) => Number(c.cursoCatalogoId) === catalogoId,
        );
        if (!found) {
          await manager.save(CursoEntity, {
            docenteId,
            gradoId: seccion.gradoId,
            seccionId,
            cursoCatalogoId: catalogoId,
          });
        } else if (Number(found.docenteId) !== docenteId) {
          await manager.update(CursoEntity, found.id, {
            docenteId,
            updatedAt: new Date(),
          });
        }
      }
    });
  }

  async listCursosSeccion(seccionId: number): Promise<Record<string, unknown>[]> {
    return this.cursoRepo.manager.query(
      `SELECT
         c.id,
         c.docente_id,
         c.grado_id,
         c.seccion_id,
         c.curso_catalogo_id,
         cc.nombre,
         cc.codigo,
         cc.nivel,
         u.name AS docente_nombre
       FROM cursos c
       LEFT JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
       LEFT JOIN usuarios u ON c.docente_id = u.id
       WHERE c.seccion_id = $1
       ORDER BY cc.nombre`,
      [seccionId],
    );
  }

  async unassignCursoSeccion(cursoId: number): Promise<void> {
    await this.cursoRepo.delete(cursoId);
  }

  async updateDocenteCurso(cursoId: number, docenteId: number): Promise<void> {
    await this.cursoRepo.update(cursoId, {
      docenteId,
      updatedAt: new Date(),
    });
  }
}
