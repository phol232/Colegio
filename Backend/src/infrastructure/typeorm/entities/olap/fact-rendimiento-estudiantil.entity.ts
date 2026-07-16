import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { DimEstudianteEntity } from './dim-estudiante.entity';
import { DimCursoEntity } from './dim-curso.entity';
import { DimTiempoEntity } from './dim-tiempo.entity';
import { DimDocenteEntity } from './dim-docente.entity';
import { DimGradoEntity } from './dim-grado.entity';
import { DimSeccionEntity } from './dim-seccion.entity';

@Entity('fact_rendimiento_estudiantil')
@Unique(['estudianteKey', 'cursoKey', 'tiempoKey'])
@Index('idx_fact_estudiante', ['estudianteKey'])
@Index('idx_fact_curso', ['cursoKey'])
@Index('idx_fact_tiempo', ['tiempoKey'])
@Index('idx_fact_grado', ['gradoKey'])
@Index('idx_fact_seccion', ['seccionKey'])
@Index('idx_fact_anio', ['anioAcademico'])
@Index('idx_fact_compuesto', ['cursoKey', 'tiempoKey'])
export class FactRendimientoEstudiantilEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'estudiante_key', type: 'int' })
  estudianteKey!: number;

  @Column({ name: 'curso_key', type: 'int' })
  cursoKey!: number;

  @Column({ name: 'tiempo_key', type: 'int' })
  tiempoKey!: number;

  @Column({ name: 'docente_key', type: 'int' })
  docenteKey!: number;

  @Column({ name: 'grado_key', type: 'int', nullable: true })
  gradoKey!: number | null;

  @Column({ name: 'seccion_key', type: 'int', nullable: true })
  seccionKey!: number | null;

  @Column({ name: 'anio_academico', type: 'smallint' })
  anioAcademico!: number;

  @Column({ name: 'total_asistencias', type: 'int', default: 0 })
  totalAsistencias!: number;

  @Column({ name: 'total_faltas', type: 'int', default: 0 })
  totalFaltas!: number;

  @Column({ name: 'total_tardanzas', type: 'int', default: 0 })
  totalTardanzas!: number;

  @Column({ name: 'porcentaje_asistencia', type: 'decimal', precision: 5, scale: 2, default: 0 })
  porcentajeAsistencia!: number;

  @Column({ name: 'total_clases', type: 'int', default: 0 })
  totalClases!: number;

  @Column({ name: 'promedio_notas', type: 'decimal', precision: 4, scale: 2, nullable: true })
  promedioNotas!: number | null;

  @Column({ name: 'nota_unidad_1', type: 'decimal', precision: 4, scale: 2, nullable: true })
  notaUnidad1!: number | null;

  @Column({ name: 'nota_unidad_2', type: 'decimal', precision: 4, scale: 2, nullable: true })
  notaUnidad2!: number | null;

  @Column({ name: 'nota_unidad_3', type: 'decimal', precision: 4, scale: 2, nullable: true })
  notaUnidad3!: number | null;

  @Column({ name: 'nota_unidad_4', type: 'decimal', precision: 4, scale: 2, nullable: true })
  notaUnidad4!: number | null;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamp' })
  fechaActualizacion!: Date;

  @ManyToOne(() => DimEstudianteEntity, (dim) => dim.hechos)
  @JoinColumn({ name: 'estudiante_key' })
  estudiante!: DimEstudianteEntity;

  @ManyToOne(() => DimCursoEntity, (dim) => dim.hechos)
  @JoinColumn({ name: 'curso_key' })
  curso!: DimCursoEntity;

  @ManyToOne(() => DimTiempoEntity, (dim) => dim.hechos)
  @JoinColumn({ name: 'tiempo_key' })
  tiempo!: DimTiempoEntity;

  @ManyToOne(() => DimDocenteEntity, (dim) => dim.hechos)
  @JoinColumn({ name: 'docente_key' })
  docente!: DimDocenteEntity;

  @ManyToOne(() => DimGradoEntity, (dim) => dim.hechos, { nullable: true })
  @JoinColumn({ name: 'grado_key' })
  grado!: DimGradoEntity | null;

  @ManyToOne(() => DimSeccionEntity, (dim) => dim.hechos, { nullable: true })
  @JoinColumn({ name: 'seccion_key' })
  seccion!: DimSeccionEntity | null;
}
