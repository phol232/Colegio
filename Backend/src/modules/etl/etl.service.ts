import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Redis from 'ioredis';
import {
  ANALYTICS_REPOSITORY,
  IAnalyticsRepository,
} from '@/domain/ports/analytics.repository.port';
import { CacheService } from '@/common/redis/cache.service';
import { CACHE_REDIS } from '@/common/redis/redis.module';
import { DimEstudianteEntity } from '@/infrastructure/typeorm/entities/olap/dim-estudiante.entity';
import { DimDocenteEntity } from '@/infrastructure/typeorm/entities/olap/dim-docente.entity';
import { DimGradoEntity } from '@/infrastructure/typeorm/entities/olap/dim-grado.entity';
import { DimSeccionEntity } from '@/infrastructure/typeorm/entities/olap/dim-seccion.entity';
import { DimCursoEntity } from '@/infrastructure/typeorm/entities/olap/dim-curso.entity';
import { DimTiempoEntity } from '@/infrastructure/typeorm/entities/olap/dim-tiempo.entity';
import { FactRendimientoEstudiantilEntity } from '@/infrastructure/typeorm/entities/olap/fact-rendimiento-estudiantil.entity';
import { ControlEtlEntity } from '@/infrastructure/typeorm/entities/olap/control-etl.entity';
import {
  OLAP_CONNECTION,
  OLTP_CONNECTION,
} from '@/infrastructure/typeorm/repositories';

const LOCK_KEY = 'lock:olap-sync';
const LOCK_TTL_SECONDS = 900;

const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const DIAS_ES = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
];

export type EtlMode = 'full' | 'incremental';

const ANALISIS_VERSION_KEY = 'analisis:version';

interface MatriculaRow {
  estudiante_id: number;
  curso_id: number;
  docente_id: number;
  grado_id: number | null;
  seccion_id: number | null;
  anio_academico: number;
}

@Injectable()
export class EtlService {
  private readonly logger = new Logger(EtlService.name);

  constructor(
    @InjectDataSource(OLTP_CONNECTION)
    private readonly oltpDataSource: DataSource,
    @InjectDataSource(OLAP_CONNECTION)
    private readonly olapDataSource: DataSource,
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analyticsRepository: IAnalyticsRepository,
    @InjectRepository(DimEstudianteEntity, OLAP_CONNECTION)
    private readonly dimEstudianteRepo: Repository<DimEstudianteEntity>,
    @InjectRepository(DimDocenteEntity, OLAP_CONNECTION)
    private readonly dimDocenteRepo: Repository<DimDocenteEntity>,
    @InjectRepository(DimGradoEntity, OLAP_CONNECTION)
    private readonly dimGradoRepo: Repository<DimGradoEntity>,
    @InjectRepository(DimSeccionEntity, OLAP_CONNECTION)
    private readonly dimSeccionRepo: Repository<DimSeccionEntity>,
    @InjectRepository(DimCursoEntity, OLAP_CONNECTION)
    private readonly dimCursoRepo: Repository<DimCursoEntity>,
    @InjectRepository(DimTiempoEntity, OLAP_CONNECTION)
    private readonly dimTiempoRepo: Repository<DimTiempoEntity>,
    @InjectRepository(FactRendimientoEstudiantilEntity, OLAP_CONNECTION)
    private readonly factRepo: Repository<FactRendimientoEstudiantilEntity>,
    @InjectRepository(ControlEtlEntity, OLAP_CONNECTION)
    private readonly controlEtlRepo: Repository<ControlEtlEntity>,
    private readonly cache: CacheService,
    @Inject(CACHE_REDIS) private readonly redis: Redis,
  ) {}

  async syncFull(): Promise<{ registros: number }> {
    return this.withLock('full', async () => {
      await this.olapDataSource.transaction(async (manager) => {
        await manager.query(
          'TRUNCATE fact_rendimiento_estudiantil RESTART IDENTITY CASCADE',
        );
        await manager.query(
          `TRUNCATE dim_estudiante, dim_docente, dim_grado, dim_seccion, dim_curso
           RESTART IDENTITY CASCADE`,
        );
      });

      await this.syncDimEstudiante(true);
      await this.syncDimDocente(true);
      await this.syncDimGrado(true);
      await this.syncDimSeccion(true);
      await this.syncDimCurso(true);
      await this.syncDimTiempo();

      const registros = await this.syncFactRendimiento(false);
      await this.registrarETL('sync_olap_full', 'success', registros);
      await this.invalidateAnalisisCache();
      await this.bumpAnalisisVersion();
      await this.logPostSyncStats();
      return { registros };
    });
  }

  async syncIncremental(): Promise<{ registros: number }> {
    return this.withLock('incremental', async () => {
      await this.syncDimEstudiante(false);
      await this.syncDimDocente(false);
      await this.syncDimGrado(false);
      await this.syncDimSeccion(false);
      await this.syncDimCurso(false);
      await this.syncDimTiempo();

      const registros = await this.syncFactRendimiento(true);
      await this.registrarETL('sync_olap_incremental', 'success', registros);
      await this.invalidateAnalisisCache();
      await this.bumpAnalisisVersion();
      await this.logPostSyncStats();
      return { registros };
    });
  }

  /**
   * Recalcula el hecho de rendimiento solo para un curso (event-driven).
   * Usa consultas agregadas + upsert por lotes para minimizar idas a BD.
   */
  async syncFactCurso(cursoId: number): Promise<{ registros: number }> {
    if (!Number.isFinite(cursoId) || cursoId <= 0) {
      return { registros: 0 };
    }

    return this.withLock(`curso:${cursoId}`, async () => {
      await this.syncDimTiempo();

      const cursoMeta = (await this.oltpDataSource.query(
        `SELECT c.id AS curso_id, c.docente_id, c.grado_id, c.seccion_id
         FROM cursos c WHERE c.id = $1`,
        [cursoId],
      )) as Array<{
        curso_id: number;
        docente_id: number;
        grado_id: number | null;
        seccion_id: number | null;
      }>;

      if (cursoMeta.length === 0) {
        return { registros: 0 };
      }

      const meta = cursoMeta[0];
      await this.ensureDimsForCurso(meta);

      const matriculas = (await this.oltpDataSource.query(
        `SELECT ec.estudiante_id, ec.curso_id, c.docente_id, c.grado_id,
                c.seccion_id, ec.anio_academico
         FROM estudiantes_cursos ec
         JOIN cursos c ON ec.curso_id = c.id
         WHERE ec.curso_id = $1`,
        [cursoId],
      )) as MatriculaRow[];

      if (matriculas.length === 0) {
        await this.invalidateAnalisisCache(cursoId);
        await this.bumpAnalisisVersion();
        await this.registrarETL('sync_olap_curso', 'success', 0);
        return { registros: 0 };
      }

      const estudianteIds = matriculas.map((m) => Number(m.estudiante_id));
      const anioByEstudiante = new Map(
        matriculas.map((m) => [
          Number(m.estudiante_id),
          Number(m.anio_academico),
        ]),
      );

      const [asistenciasRows, promediosRows] = await Promise.all([
        this.oltpDataSource.query(
          `SELECT
             a.estudiante_id,
             COUNT(*)::int AS total_clases,
             SUM(CASE WHEN a.estado IN ('presente', 'tardanza') THEN 1 ELSE 0 END)::int
               AS total_asistencias,
             SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END)::int AS total_faltas,
             SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END)::int AS total_tardanzas,
             EXTRACT(YEAR FROM a.fecha)::int AS anio
           FROM asistencias a
           WHERE a.curso_id = $1
             AND a.estudiante_id = ANY($2::bigint[])
           GROUP BY a.estudiante_id, EXTRACT(YEAR FROM a.fecha)`,
          [cursoId, estudianteIds],
        ) as Promise<
          Array<{
            estudiante_id: number;
            total_clases: number;
            total_asistencias: number;
            total_faltas: number;
            total_tardanzas: number;
            anio: number;
          }>
        >,
        this.oltpDataSource.query(
          `SELECT
             estudiante_id,
             AVG(promedio_numerico)::float8 AS promedio_general,
             AVG(CASE WHEN unidad = 1 THEN promedio_numerico END)::float8 AS nota_unidad_1,
             AVG(CASE WHEN unidad = 2 THEN promedio_numerico END)::float8 AS nota_unidad_2,
             AVG(CASE WHEN unidad = 3 THEN promedio_numerico END)::float8 AS nota_unidad_3,
             AVG(CASE WHEN unidad = 4 THEN promedio_numerico END)::float8 AS nota_unidad_4
           FROM promedios_unidad
           WHERE curso_id = $1
             AND estudiante_id = ANY($2::bigint[])
           GROUP BY estudiante_id`,
          [cursoId, estudianteIds],
        ) as Promise<
          Array<{
            estudiante_id: number;
            promedio_general: number | null;
            nota_unidad_1: number | null;
            nota_unidad_2: number | null;
            nota_unidad_3: number | null;
            nota_unidad_4: number | null;
          }>
        >,
      ]);

      const asistenciaMap = new Map<
        number,
        {
          totalClases: number;
          totalAsistencias: number;
          totalFaltas: number;
          totalTardanzas: number;
        }
      >();
      for (const row of asistenciasRows) {
        const estId = Number(row.estudiante_id);
        const expectedAnio = anioByEstudiante.get(estId);
        if (expectedAnio != null && Number(row.anio) !== expectedAnio) {
          continue;
        }
        asistenciaMap.set(estId, {
          totalClases: Number(row.total_clases ?? 0),
          totalAsistencias: Number(row.total_asistencias ?? 0),
          totalFaltas: Number(row.total_faltas ?? 0),
          totalTardanzas: Number(row.total_tardanzas ?? 0),
        });
      }

      const promedioMap = new Map(
        promediosRows.map((row) => [
          Number(row.estudiante_id),
          {
            promedioGeneral:
              row.promedio_general != null
                ? Number(row.promedio_general)
                : null,
            notaUnidad1:
              row.nota_unidad_1 != null ? Number(row.nota_unidad_1) : null,
            notaUnidad2:
              row.nota_unidad_2 != null ? Number(row.nota_unidad_2) : null,
            notaUnidad3:
              row.nota_unidad_3 != null ? Number(row.nota_unidad_3) : null,
            notaUnidad4:
              row.nota_unidad_4 != null ? Number(row.nota_unidad_4) : null,
          },
        ]),
      );

      const today = new Date().toISOString().slice(0, 10);
      const [cursoDim, docenteDim, tiempoDim, gradoDim, seccionDim] =
        await Promise.all([
          this.dimCursoRepo.findOne({ where: { cursoId } }),
          this.dimDocenteRepo.findOne({
            where: { docenteId: Number(meta.docente_id) },
          }),
          this.dimTiempoRepo.findOne({ where: { fecha: today } }),
          meta.grado_id
            ? this.dimGradoRepo.findOne({
                where: { gradoId: Number(meta.grado_id) },
              })
            : Promise.resolve(null),
          meta.seccion_id
            ? this.dimSeccionRepo.findOne({
                where: { seccionId: Number(meta.seccion_id) },
              })
            : Promise.resolve(null),
        ]);

      if (!cursoDim || !docenteDim || !tiempoDim) {
        this.logger.warn(
          `syncFactCurso(${cursoId}): dimensiones incompletas, abortando`,
        );
        return { registros: 0 };
      }

      const estudianteDims = await this.dimEstudianteRepo
        .createQueryBuilder('d')
        .where('d.estudiante_id IN (:...ids)', { ids: estudianteIds })
        .getMany();
      const estudianteKeyById = new Map(
        estudianteDims.map((d) => [Number(d.estudianteId), d.estudianteKey]),
      );

      const now = new Date();
      const values: Array<Partial<FactRendimientoEstudiantilEntity>> = [];
      for (const m of matriculas) {
        const estudianteKey = estudianteKeyById.get(Number(m.estudiante_id));
        if (!estudianteKey) continue;

        const asist = asistenciaMap.get(Number(m.estudiante_id));
        const prom = promedioMap.get(Number(m.estudiante_id));
        const totalClases = asist?.totalClases ?? 0;
        const totalAsistencias = asist?.totalAsistencias ?? 0;
        const porcentaje =
          totalClases > 0
            ? Math.round((totalAsistencias / totalClases) * 10000) / 100
            : 0;

        values.push({
          estudianteKey,
          cursoKey: cursoDim.cursoKey,
          tiempoKey: tiempoDim.tiempoKey,
          docenteKey: docenteDim.docenteKey,
          gradoKey: gradoDim?.gradoKey ?? null,
          seccionKey: seccionDim?.seccionKey ?? null,
          anioAcademico: m.anio_academico,
          totalAsistencias,
          totalFaltas: asist?.totalFaltas ?? 0,
          totalTardanzas: asist?.totalTardanzas ?? 0,
          porcentajeAsistencia: porcentaje,
          totalClases,
          promedioNotas: prom?.promedioGeneral ?? null,
          notaUnidad1: prom?.notaUnidad1 ?? null,
          notaUnidad2: prom?.notaUnidad2 ?? null,
          notaUnidad3: prom?.notaUnidad3 ?? null,
          notaUnidad4: prom?.notaUnidad4 ?? null,
          fechaActualizacion: now,
        });
      }

      if (values.length > 0) {
        await this.factRepo.upsert(values, [
          'estudianteKey',
          'cursoKey',
          'tiempoKey',
        ]);
      }

      const registros = values.length;
      await this.registrarETL('sync_olap_curso', 'success', registros);
      await this.invalidateAnalisisCache(cursoId);
      await this.bumpAnalisisVersion();
      this.logger.log(`fact_rendimiento curso=${cursoId}: ${registros}`);
      return { registros };
    });
  }

  async run(mode: EtlMode) {
    return mode === 'full' ? this.syncFull() : this.syncIncremental();
  }

  private async ensureDimsForCurso(meta: {
    curso_id: number;
    docente_id: number;
    grado_id: number | null;
    seccion_id: number | null;
  }) {
    const estudiantes = (await this.oltpDataSource.query(
      `SELECT DISTINCT u.id, u.name, u.email
       FROM estudiantes_cursos ec
       JOIN usuarios u ON u.id = ec.estudiante_id
       WHERE ec.curso_id = $1`,
      [meta.curso_id],
    )) as Array<{ id: number; name: string; email: string }>;

    for (const e of estudiantes) {
      await this.dimEstudianteRepo.upsert(
        {
          estudianteId: e.id,
          nombre: e.name,
          email: e.email,
          fechaCarga: new Date(),
        },
        ['estudianteId'],
      );
    }

    const docentes = (await this.oltpDataSource.query(
      `SELECT id, name, email FROM usuarios WHERE id = $1`,
      [meta.docente_id],
    )) as Array<{ id: number; name: string; email: string }>;
    for (const d of docentes) {
      await this.dimDocenteRepo.upsert(
        {
          docenteId: d.id,
          nombre: d.name,
          email: d.email,
          fechaCarga: new Date(),
        },
        ['docenteId'],
      );
    }

    if (meta.grado_id) {
      const grados = (await this.oltpDataSource.query(
        `SELECT id, nivel, numero, nombre FROM grados WHERE id = $1`,
        [meta.grado_id],
      )) as Array<{
        id: number;
        nivel: string;
        numero: number;
        nombre: string;
      }>;
      for (const g of grados) {
        await this.dimGradoRepo.upsert(
          {
            gradoId: g.id,
            nivel: g.nivel,
            numero: g.numero,
            nombre: g.nombre,
            fechaCarga: new Date(),
          },
          ['gradoId'],
        );
      }
    }

    if (meta.seccion_id) {
      const secciones = (await this.oltpDataSource.query(
        `SELECT s.id, s.nombre, g.id AS grado_id,
                CONCAT(g.numero, 'ro ', g.nivel) AS grado_nombre
         FROM secciones s
         JOIN grados g ON s.grado_id = g.id
         WHERE s.id = $1`,
        [meta.seccion_id],
      )) as Array<{
        id: number;
        nombre: string;
        grado_id: number;
        grado_nombre: string;
      }>;
      for (const s of secciones) {
        const grado = await this.dimGradoRepo.findOne({
          where: { gradoId: s.grado_id },
        });
        if (!grado) continue;
        await this.dimSeccionRepo.upsert(
          {
            seccionId: s.id,
            nombre: s.nombre,
            gradoKey: grado.gradoKey,
            gradoNombre: s.grado_nombre,
            fechaCarga: new Date(),
          },
          ['seccionId'],
        );
      }
    }

    const cursos = (await this.oltpDataSource.query(
      `SELECT c.id,
              cc.nombre,
              cc.codigo,
              u.name AS docente_nombre,
              CONCAT(g.numero, 'ro ', g.nivel) AS grado_nombre,
              s.nombre AS seccion_nombre
       FROM cursos c
       JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
       JOIN usuarios u ON c.docente_id = u.id
       LEFT JOIN grados g ON c.grado_id = g.id
       LEFT JOIN secciones s ON c.seccion_id = s.id
       WHERE c.id = $1`,
      [meta.curso_id],
    )) as Array<{
      id: number;
      nombre: string;
      codigo: string;
      docente_nombre: string;
      grado_nombre: string | null;
      seccion_nombre: string | null;
    }>;
    for (const c of cursos) {
      await this.dimCursoRepo.upsert(
        {
          cursoId: c.id,
          nombre: c.nombre,
          codigo: c.codigo,
          docenteNombre: c.docente_nombre,
          gradoNombre: c.grado_nombre,
          seccionNombre: c.seccion_nombre,
          fechaCarga: new Date(),
        },
        ['cursoId'],
      );
    }
  }

  private async invalidateAnalisisCache(cursoId?: number) {
    if (cursoId != null) {
      await Promise.all([
        this.cache.delByPattern(`analisis:curso:${cursoId}:*`),
        this.cache.delByPattern(`analisis:ranking:curso:${cursoId}:*`),
        this.cache.delByPattern('analisis:generales:*'),
        this.cache.delByPattern('analisis:comparativa:*'),
        this.cache.delByPattern('analisis:estudiante:*'),
      ]);
      return;
    }
    await this.cache.delByPattern('analisis:*');
  }

  private async bumpAnalisisVersion() {
    try {
      await this.redis.incr(ANALISIS_VERSION_KEY);
    } catch (error) {
      this.logger.warn(
        `No se pudo incrementar analisis:version: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async withLock<T>(
    mode: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const token = `${mode}:${Date.now()}`;
    const acquired = await this.redis.set(
      LOCK_KEY,
      token,
      'EX',
      LOCK_TTL_SECONDS,
      'NX',
    );

    if (acquired !== 'OK') {
      throw new ServiceUnavailableException(
        'Ya hay una sincronización OLAP en curso',
      );
    }

    const start = Date.now();
    this.logger.log(`ETL ${mode} iniciado`);

    try {
      const result = await fn();
      this.logger.log(
        `ETL ${mode} completado en ${Math.round((Date.now() - start) / 1000)}s`,
      );
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`ETL ${mode} falló: ${message}`);
      await this.registrarETL(`sync_olap_${mode}`, 'error', 0, message);
      throw error;
    } finally {
      const current = await this.redis.get(LOCK_KEY);
      if (current === token) {
        await this.redis.del(LOCK_KEY);
      }
    }
  }

  private async syncDimEstudiante(_truncated: boolean) {
    const estudiantes = (await this.oltpDataSource.query(
      `SELECT id, name, email FROM usuarios WHERE role = 'estudiante'`,
    )) as Array<{ id: number; name: string; email: string }>;

    for (const e of estudiantes) {
      await this.dimEstudianteRepo.upsert(
        {
          estudianteId: e.id,
          nombre: e.name,
          email: e.email,
          fechaCarga: new Date(),
        },
        ['estudianteId'],
      );
    }
    this.logger.log(`dim_estudiante: ${estudiantes.length}`);
  }

  private async syncDimDocente(_truncated: boolean) {
    const docentes = (await this.oltpDataSource.query(
      `SELECT id, name, email FROM usuarios WHERE role = 'docente'`,
    )) as Array<{ id: number; name: string; email: string }>;

    for (const d of docentes) {
      await this.dimDocenteRepo.upsert(
        {
          docenteId: d.id,
          nombre: d.name,
          email: d.email,
          fechaCarga: new Date(),
        },
        ['docenteId'],
      );
    }
    this.logger.log(`dim_docente: ${docentes.length}`);
  }

  private async syncDimGrado(_truncated: boolean) {
    const grados = (await this.oltpDataSource.query(
      `SELECT id, nivel, numero, nombre FROM grados`,
    )) as Array<{ id: number; nivel: string; numero: number; nombre: string }>;

    for (const g of grados) {
      await this.dimGradoRepo.upsert(
        {
          gradoId: g.id,
          nivel: g.nivel,
          numero: g.numero,
          nombre: g.nombre,
          fechaCarga: new Date(),
        },
        ['gradoId'],
      );
    }
    this.logger.log(`dim_grado: ${grados.length}`);
  }

  private async syncDimSeccion(_truncated: boolean) {
    const secciones = (await this.oltpDataSource.query(
      `SELECT s.id, s.nombre, g.id AS grado_id,
              CONCAT(g.numero, 'ro ', g.nivel) AS grado_nombre
       FROM secciones s
       JOIN grados g ON s.grado_id = g.id`,
    )) as Array<{
      id: number;
      nombre: string;
      grado_id: number;
      grado_nombre: string;
    }>;

    for (const s of secciones) {
      const grado = await this.dimGradoRepo.findOne({
        where: { gradoId: s.grado_id },
      });
      if (!grado) continue;

      await this.dimSeccionRepo.upsert(
        {
          seccionId: s.id,
          nombre: s.nombre,
          gradoKey: grado.gradoKey,
          gradoNombre: s.grado_nombre,
          fechaCarga: new Date(),
        },
        ['seccionId'],
      );
    }
    this.logger.log(`dim_seccion: ${secciones.length}`);
  }

  private async syncDimCurso(_truncated: boolean) {
    const cursos = (await this.oltpDataSource.query(
      `SELECT c.id,
              cc.nombre,
              cc.codigo,
              u.name AS docente_nombre,
              CONCAT(g.numero, 'ro ', g.nivel) AS grado_nombre,
              s.nombre AS seccion_nombre
       FROM cursos c
       JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
       JOIN usuarios u ON c.docente_id = u.id
       LEFT JOIN grados g ON c.grado_id = g.id
       LEFT JOIN secciones s ON c.seccion_id = s.id`,
    )) as Array<{
      id: number;
      nombre: string;
      codigo: string;
      docente_nombre: string;
      grado_nombre: string | null;
      seccion_nombre: string | null;
    }>;

    for (const c of cursos) {
      await this.dimCursoRepo.upsert(
        {
          cursoId: c.id,
          nombre: c.nombre,
          codigo: c.codigo,
          docenteNombre: c.docente_nombre,
          gradoNombre: c.grado_nombre,
          seccionNombre: c.seccion_nombre,
          fechaCarga: new Date(),
        },
        ['cursoId'],
      );
    }
    this.logger.log(`dim_curso: ${cursos.length}`);
  }

  private async syncDimTiempo() {
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    end.setHours(0, 0, 0, 0);

    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const fecha = current.toISOString().slice(0, 10);
      const exists = await this.dimTiempoRepo.findOne({ where: { fecha } });

      if (!exists) {
        const dia = current.getUTCDate();
        const mes = current.getUTCMonth() + 1;
        const anio = current.getUTCFullYear();
        const jsDay = current.getUTCDay();
        const diaSemana = jsDay === 0 ? 7 : jsDay;
        const trimestre = Math.ceil(mes / 3);
        const semestre = mes <= 6 ? 1 : 2;

        await this.dimTiempoRepo
          .createQueryBuilder()
          .insert()
          .into(DimTiempoEntity)
          .values({
            fecha,
            dia,
            mes,
            anio,
            trimestre,
            semestre,
            diaSemana,
            nombreMes: MESES_ES[mes - 1],
            nombreDia: DIAS_ES[diaSemana - 1],
          })
          .orIgnore()
          .execute();

        count++;
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    this.logger.log(`dim_tiempo: ${count} fechas nuevas`);
  }

  private async syncFactRendimiento(incremental: boolean): Promise<number> {
    let matriculasSql = `
      SELECT ec.estudiante_id, ec.curso_id, c.docente_id, c.grado_id, c.seccion_id, ec.anio_academico
      FROM estudiantes_cursos ec
      JOIN cursos c ON ec.curso_id = c.id
    `;

    if (incremental) {
      matriculasSql += `
        WHERE EXISTS (
             SELECT 1 FROM asistencias a
             WHERE a.estudiante_id = ec.estudiante_id
               AND a.curso_id = ec.curso_id
               AND a.updated_at >= NOW() - INTERVAL '24 hours'
           )
           OR EXISTS (
             SELECT 1 FROM promedios_unidad p
             WHERE p.estudiante_id = ec.estudiante_id
               AND p.curso_id = ec.curso_id
               AND p.updated_at >= NOW() - INTERVAL '24 hours'
           )
           OR EXISTS (
             SELECT 1 FROM notas_detalle nd
             INNER JOIN evaluaciones e ON e.id = nd.evaluacion_id
             WHERE e.curso_id = ec.curso_id
               AND nd.estudiante_id = ec.estudiante_id
               AND nd.updated_at >= NOW() - INTERVAL '24 hours'
           )
           OR ec.created_at >= NOW() - INTERVAL '24 hours'
      `;
    }

    const matriculas = (await this.oltpDataSource.query(
      matriculasSql,
    )) as MatriculaRow[];

    const today = new Date().toISOString().slice(0, 10);
    let count = 0;

    for (const m of matriculas) {
      const [estudiante, curso, docente, tiempo] = await Promise.all([
        this.dimEstudianteRepo.findOne({
          where: { estudianteId: m.estudiante_id },
        }),
        this.dimCursoRepo.findOne({ where: { cursoId: m.curso_id } }),
        this.dimDocenteRepo.findOne({ where: { docenteId: m.docente_id } }),
        this.dimTiempoRepo.findOne({ where: { fecha: today } }),
      ]);

      if (!estudiante || !curso || !docente || !tiempo) {
        continue;
      }

      const grado = m.grado_id
        ? await this.dimGradoRepo.findOne({ where: { gradoId: m.grado_id } })
        : null;

      const seccion = m.seccion_id
        ? await this.dimSeccionRepo.findOne({
            where: { seccionId: m.seccion_id },
          })
        : null;

      const asistenciasRows = (await this.oltpDataSource.query(
        `SELECT
           COUNT(*)::text AS total_clases,
           SUM(CASE WHEN estado IN ('presente', 'tardanza') THEN 1 ELSE 0 END)::text
             AS total_asistencias,
           SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END)::text AS total_faltas,
           SUM(CASE WHEN estado = 'tardanza' THEN 1 ELSE 0 END)::text AS total_tardanzas
         FROM asistencias
         WHERE estudiante_id = $1
           AND curso_id = $2
           AND EXTRACT(YEAR FROM fecha) = $3`,
        [m.estudiante_id, m.curso_id, m.anio_academico],
      )) as Array<{
        total_clases: string;
        total_asistencias: string;
        total_faltas: string;
        total_tardanzas: string;
      }>;
      const asistencias = asistenciasRows[0];

      const totalClases = Number(asistencias?.total_clases ?? 0);
      const totalAsistencias = Number(asistencias?.total_asistencias ?? 0);
      const totalFaltas = Number(asistencias?.total_faltas ?? 0);
      const totalTardanzas = Number(asistencias?.total_tardanzas ?? 0);
      const porcentaje =
        totalClases > 0
          ? Math.round((totalAsistencias / totalClases) * 10000) / 100
          : 0;

      const promediosRows = (await this.oltpDataSource.query(
        `SELECT
           AVG(promedio_numerico)::text AS promedio_general,
           AVG(CASE WHEN unidad = 1 THEN promedio_numerico END)::text AS nota_unidad_1,
           AVG(CASE WHEN unidad = 2 THEN promedio_numerico END)::text AS nota_unidad_2,
           AVG(CASE WHEN unidad = 3 THEN promedio_numerico END)::text AS nota_unidad_3,
           AVG(CASE WHEN unidad = 4 THEN promedio_numerico END)::text AS nota_unidad_4
         FROM promedios_unidad
         WHERE estudiante_id = $1 AND curso_id = $2`,
        [m.estudiante_id, m.curso_id],
      )) as Array<{
        promedio_general: string | null;
        nota_unidad_1: string | null;
        nota_unidad_2: string | null;
        nota_unidad_3: string | null;
        nota_unidad_4: string | null;
      }>;
      const promedios = promediosRows[0];

      await this.factRepo.upsert(
        {
          estudianteKey: estudiante.estudianteKey,
          cursoKey: curso.cursoKey,
          tiempoKey: tiempo.tiempoKey,
          docenteKey: docente.docenteKey,
          gradoKey: grado?.gradoKey ?? null,
          seccionKey: seccion?.seccionKey ?? null,
          anioAcademico: m.anio_academico,
          totalAsistencias,
          totalFaltas,
          totalTardanzas,
          porcentajeAsistencia: porcentaje,
          totalClases,
          promedioNotas:
            promedios?.promedio_general != null
              ? Number(promedios.promedio_general)
              : null,
          notaUnidad1:
            promedios?.nota_unidad_1 != null
              ? Number(promedios.nota_unidad_1)
              : null,
          notaUnidad2:
            promedios?.nota_unidad_2 != null
              ? Number(promedios.nota_unidad_2)
              : null,
          notaUnidad3:
            promedios?.nota_unidad_3 != null
              ? Number(promedios.nota_unidad_3)
              : null,
          notaUnidad4:
            promedios?.nota_unidad_4 != null
              ? Number(promedios.nota_unidad_4)
              : null,
          fechaActualizacion: new Date(),
        },
        ['estudianteKey', 'cursoKey', 'tiempoKey'],
      );

      count++;
    }

    this.logger.log(`fact_rendimiento: ${count} registros`);
    return count;
  }

  private async logPostSyncStats() {
    try {
      const stats = await this.analyticsRepository.getGeneralStats();
      this.logger.log(
        `OLAP post-sync: ${stats.totalEstudiantes} estudiantes, ${stats.totalCursos} cursos`,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudieron leer estadísticas OLAP: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async registrarETL(
    proceso: string,
    estado: string,
    registrosProcesados: number,
    errores: string | null = null,
  ) {
    try {
      const total = await this.factRepo.count();
      await this.controlEtlRepo.save({
        proceso,
        ultimaEjecucion: new Date(),
        estado,
        registrosProcesados: registrosProcesados || total,
        errores,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar ETL: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
