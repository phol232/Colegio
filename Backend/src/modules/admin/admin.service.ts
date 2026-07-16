import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  ADMIN_REPOSITORY,
  IAdminRepository,
} from '@/domain/ports/admin.repository.port';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '@/domain/ports/auth.repository.port';
import {
  ENROLLMENT_REPOSITORY,
  IEnrollmentRepository,
} from '@/domain/ports/enrollment.repository.port';
import {
  IUserRepository,
  USER_REPOSITORY,
  UserRecord,
} from '@/domain/ports/user.repository.port';
import { MaintenanceService } from '@/common/services/maintenance.service';
import { CacheService } from '@/common/redis/cache.service';
import {
  ActualizarConfiguracionDto,
  ActualizarCursoCatalogoDto,
  ActualizarDocenteCursoDto,
  ActualizarGradoDto,
  ActualizarSeccionDto,
  AsignarCursosSeccionDto,
  AsignarEstudiantesSeccionDto,
  AsignarEstudianteCursoDto,
  CambiarEstadoUsuarioDto,
  CrearCursoCatalogoDto,
  CrearGradoDto,
  CrearSeccionDto,
  CrearUsuarioDto,
} from './dto/admin.dto';

function mapUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    activo: user.activo,
    dni: user.dni ?? null,
    telefono: user.telefono ?? null,
    direccion: user.direccion ?? null,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

function mapConfig(config: {
  id: number;
  nombreInstitucion: string;
  anioAcademico: number;
  periodoEvaluacion: string;
  modoMantenimiento: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: config.id,
    nombre_institucion: config.nombreInstitucion,
    anio_academico: config.anioAcademico,
    periodo_evaluacion: config.periodoEvaluacion,
    modo_mantenimiento: config.modoMantenimiento,
    ...(config.createdAt != null ? { created_at: config.createdAt } : {}),
    ...(config.updatedAt != null ? { updated_at: config.updatedAt } : {}),
  };
}

function mapEntity(row: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const snake = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    mapped[snake] = value;
  }
  return mapped;
}

@Injectable()
export class AdminService {
  constructor(
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepo: IAdminRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(ENROLLMENT_REPOSITORY)
    private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject(AUTH_REPOSITORY)
    private readonly authRepo: IAuthRepository,
    private readonly maintenanceService: MaintenanceService,
    private readonly cache: CacheService,
  ) {}

  async obtenerEstadisticas() {
    const stats = await this.adminRepo.getDashboardStats();

    return {
      success: true,
      data: {
        total_estudiantes: stats.totalEstudiantes,
        total_docentes: stats.totalDocentes,
        total_cursos: stats.totalCursos,
        total_secciones: stats.totalSecciones,
        estudiantes_por_nivel: stats.estudiantesPorNivel,
        cursos_por_nivel: stats.cursosPorNivel,
      },
    };
  }

  async obtenerSeccionesInfo() {
    const secciones = await this.adminRepo.getSeccionesInfo();
    return { success: true, data: secciones };
  }

  async getConfiguracion() {
    const config = await this.adminRepo.getConfiguracion();
    if (!config) {
      throw new BadRequestException('No hay configuración del sistema');
    }
    return { success: true, data: mapConfig(config) };
  }

  async actualizarConfiguracion(dto: ActualizarConfiguracionDto) {
    const updated = await this.adminRepo.updateConfiguracion({
      nombreInstitucion: dto.nombre_institucion ?? undefined,
      anioAcademico: dto.anio_academico ?? undefined,
      periodoEvaluacion: dto.periodo_evaluacion ?? undefined,
      modoMantenimiento: dto.modo_mantenimiento ?? undefined,
    });

    await this.maintenanceService.invalidateCache();

    return {
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: mapConfig(updated),
    };
  }

  async listarGrados() {
    const grados = await this.adminRepo.listGrados();
    const data = await Promise.all(
      grados.map(async (grado) => {
        const secciones = await this.adminRepo.listSeccionesByGrado(
          Number(grado.id),
        );
        return {
          ...mapEntity(grado),
          secciones: secciones.map(mapEntity),
        };
      }),
    );
    return { success: true, data };
  }

  async crearGrado(dto: CrearGradoDto) {
    const grado = await this.adminRepo.createGrado(
      dto.nivel,
      dto.numero,
      dto.nombre,
    );
    return {
      success: true,
      message: 'Grado creado exitosamente',
      data: mapEntity(grado),
    };
  }

  async actualizarGrado(id: number, dto: ActualizarGradoDto) {
    const grado = await this.adminRepo.updateGrado(id, {
      nivel: dto.nivel ?? undefined,
      numero: dto.numero ?? undefined,
      nombre: dto.nombre ?? undefined,
    });
    return {
      success: true,
      message: 'Grado actualizado exitosamente',
      data: mapEntity(grado),
    };
  }

  async eliminarGrado(id: number) {
    await this.adminRepo.deleteGrado(id);
    return { success: true, message: 'Grado eliminado exitosamente' };
  }

  async listarSeccionesGrado(gradoId: number) {
    const secciones = await this.adminRepo.listSeccionesByGrado(gradoId);
    return { success: true, data: secciones.map(mapEntity) };
  }

  async crearSeccion(gradoId: number, dto: CrearSeccionDto) {
    const seccion = await this.adminRepo.createSeccion(
      gradoId,
      dto.nombre,
      dto.capacidad ?? 30,
    );
    return {
      success: true,
      message: 'Sección creada exitosamente',
      data: mapEntity(seccion),
    };
  }

  async actualizarSeccion(id: number, dto: ActualizarSeccionDto) {
    const seccion = await this.adminRepo.updateSeccion(id, {
      nombre: dto.nombre ?? undefined,
      capacidad: dto.capacidad ?? undefined,
    });
    return {
      success: true,
      message: 'Sección actualizada exitosamente',
      data: mapEntity(seccion),
    };
  }

  async eliminarSeccion(id: number) {
    await this.adminRepo.deleteSeccion(id);
    return { success: true, message: 'Sección eliminada exitosamente' };
  }

  async listarTodosEstudiantes() {
    const estudiantes = await this.adminRepo.listAllStudents();
    return { success: true, data: estudiantes.map(mapEntity) };
  }

  async listarEstudiantesDisponibles() {
    const estudiantes = await this.adminRepo.listAvailableStudents();
    return { success: true, data: estudiantes.map(mapEntity) };
  }

  async listarEstudiantesSeccion(seccionId: number) {
    const estudiantes = await this.adminRepo.listStudentsBySeccion(seccionId);
    return { success: true, data: estudiantes.map(mapEntity) };
  }

  async asignarEstudiantesSeccion(
    seccionId: number,
    dto: AsignarEstudiantesSeccionDto,
  ) {
    await this.adminRepo.assignStudentsToSeccion(
      seccionId,
      dto.estudiantes_ids,
    );
    return {
      success: true,
      message: 'Estudiantes asignados a la sección exitosamente',
    };
  }

  async asignarEstudianteCurso(
    cursoId: number,
    dto: AsignarEstudianteCursoDto,
  ) {
    const estudiante = await this.userRepo.findById(dto.estudiante_id);

    if (!estudiante || estudiante.role !== 'estudiante') {
      throw new BadRequestException('El usuario no es un estudiante');
    }

    const anio = new Date().getFullYear();

    try {
      await this.enrollmentRepo.assignStudentToCourse(
        dto.estudiante_id,
        cursoId,
        anio,
      );
    } catch (e: any) {
      if (e?.code === '23505') {
        throw new BadRequestException(
          'El estudiante ya está asignado a este curso',
        );
      }
      throw e;
    }

    return {
      success: true,
      message: 'Estudiante asignado exitosamente',
    };
  }

  async listarDocentes() {
    const docentes = await this.adminRepo.listTeachers();
    return { success: true, data: docentes.map(mapEntity) };
  }

  async listarCatalogoCursos(nivel?: string) {
    const cursos = await this.adminRepo.listCatalogoCursos(nivel);
    return { success: true, data: cursos.map(mapEntity) };
  }

  async crearCursoCatalogo(dto: CrearCursoCatalogoDto) {
    const curso = await this.adminRepo.createCursoCatalogo({
      nombre: dto.nombre,
      codigo: dto.codigo,
      nivel: dto.nivel,
      descripcion: dto.descripcion ?? null,
    });
    return {
      success: true,
      message: 'Curso de catálogo creado exitosamente',
      data: mapEntity(curso),
    };
  }

  async actualizarCursoCatalogo(id: number, dto: ActualizarCursoCatalogoDto) {
    const curso = await this.adminRepo.updateCursoCatalogo(id, {
      nombre: dto.nombre ?? undefined,
      codigo: dto.codigo ?? undefined,
      nivel: dto.nivel ?? undefined,
      descripcion: dto.descripcion ?? undefined,
    });
    return {
      success: true,
      message: 'Curso de catálogo actualizado exitosamente',
      data: mapEntity(curso),
    };
  }

  async eliminarCursoCatalogo(id: number) {
    await this.adminRepo.deleteCursoCatalogo(id);
    return {
      success: true,
      message: 'Curso de catálogo eliminado exitosamente',
    };
  }

  async asignarCursosSeccion(seccionId: number, dto: AsignarCursosSeccionDto) {
    await this.adminRepo.assignCursosSeccion(
      seccionId,
      dto.docente_id,
      dto.cursos_catalogo_ids,
    );
    return {
      success: true,
      message: 'Cursos asignados a la sección exitosamente',
    };
  }

  async listarCursosSeccion(seccionId: number) {
    const cursos = await this.adminRepo.listCursosSeccion(seccionId);
    return { success: true, data: cursos };
  }

  async desasignarCursoSeccion(cursoId: number) {
    await this.adminRepo.unassignCursoSeccion(cursoId);
    return { success: true, message: 'Curso desasignado exitosamente' };
  }

  async actualizarDocenteCurso(cursoId: number, dto: ActualizarDocenteCursoDto) {
    await this.adminRepo.updateDocenteCurso(cursoId, dto.docente_id);
    return {
      success: true,
      message: 'Docente del curso actualizado exitosamente',
    };
  }

  async listarUsuarios(role?: string) {
    const users = await this.userRepo.listAll(
      role ? { role: role as UserRecord['role'] } : undefined,
    );
    return { success: true, data: users.map(mapUser) };
  }

  async crearUsuario(dto: CrearUsuarioDto) {
    const existingEmail = await this.userRepo.findByEmail(dto.email);
    if (existingEmail) {
      throw new BadRequestException('El email ya está registrado');
    }

    if (dto.dni) {
      const existingDni = await this.userRepo.findByDni(dto.dni);
      if (existingDni) {
        throw new BadRequestException('El DNI ya está registrado');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.userRepo.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role,
      dni: dto.dni ?? null,
      telefono: dto.telefono ?? null,
      direccion: dto.direccion ?? null,
    });

    return {
      success: true,
      message: 'Usuario creado exitosamente',
      data: mapUser(created),
    };
  }

  async cambiarEstadoUsuario(
    id: number,
    dto: CambiarEstadoUsuarioDto,
    currentUserId: number,
  ) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (id === currentUserId && !dto.activo) {
      throw new BadRequestException('No puedes bloquear tu propia cuenta');
    }

    if (user.role === 'admin' && !dto.activo) {
      const adminCount = await this.userRepo.countByRole('admin');
      if (adminCount <= 1) {
        throw new BadRequestException(
          'No se puede bloquear al único administrador del sistema',
        );
      }
    }

    const updated = await this.userRepo.setActivo(id, dto.activo);

    if (!dto.activo) {
      await this.cache.set(`blocked:user:${id}`, true, 3600);
      await this.authRepo.revokeAllTokensForUser(id);
    } else {
      await this.cache.del(`blocked:user:${id}`);
    }

    return {
      success: true,
      message: dto.activo
        ? 'Usuario desbloqueado exitosamente'
        : 'Usuario bloqueado exitosamente',
      data: mapUser(updated),
    };
  }

  async eliminarUsuario(id: number, currentUserId: number) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (id === currentUserId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }

    if (user.role === 'admin') {
      const adminCount = await this.userRepo.countByRole('admin');
      if (adminCount <= 1) {
        throw new BadRequestException(
          'No se puede eliminar al único administrador del sistema',
        );
      }
    }

    await this.authRepo.revokeAllTokensForUser(id);
    await this.userRepo.deleteById(id);

    return {
      success: true,
      message: 'Usuario eliminado exitosamente',
    };
  }
}
