import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UsuarioEntity } from './usuario.entity';
import { CursoEntity } from './curso.entity';

@Entity('promedios_unidad')
@Unique('uk_promedio_estudiante_curso_unidad', ['estudianteId', 'cursoId', 'unidad'])
@Index('idx_promedios_curso_unidad', ['cursoId', 'unidad'])
@Index('idx_promedios_estudiante', ['estudianteId'])
export class PromedioUnidadEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'estudiante_id', type: 'bigint' })
  estudianteId!: number;

  @Column({ name: 'curso_id', type: 'bigint' })
  cursoId!: number;

  @Column({ name: 'unidad', type: 'smallint' })
  unidad!: number;

  @Column({ name: 'promedio_numerico', type: 'decimal', precision: 4, scale: 2 })
  promedioNumerico!: number;

  @Column({ name: 'promedio_literal', type: 'varchar', length: 2, nullable: true })
  promedioLiteral!: string | null;

  @Column({ name: 'total_evaluaciones', type: 'smallint', default: 0 })
  totalEvaluaciones!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => UsuarioEntity, (usuario) => usuario.promediosUnidad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante!: UsuarioEntity;

  @ManyToOne(() => CursoEntity, (curso) => curso.promediosUnidad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_id' })
  curso!: CursoEntity;
}
