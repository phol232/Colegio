import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CursoEntity } from './curso.entity';
import { NotaDetalleEntity } from './nota-detalle.entity';

@Entity('evaluaciones')
@Unique('uk_evaluacion_curso_unidad_nombre', ['cursoId', 'unidad', 'nombre'])
@Index('idx_evaluaciones_curso_unidad', ['cursoId', 'unidad'])
@Index('idx_evaluaciones_tipo', ['tipoEvaluacion'])
@Index('idx_evaluaciones_curso_mes', ['cursoId', 'mes'])
export class EvaluacionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'curso_id', type: 'bigint' })
  cursoId!: number;

  @Column({ name: 'unidad', type: 'smallint', nullable: true })
  unidad!: number | null;

  @Column({ name: 'mes', type: 'int' })
  mes!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ name: 'tipo_evaluacion', type: 'varchar', length: 50 })
  tipoEvaluacion!: string;

  @Column({ name: 'peso', type: 'decimal', precision: 5, scale: 2, nullable: true })
  peso!: number | null;

  @Column({ name: 'orden', type: 'smallint', default: 1 })
  orden!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => CursoEntity, (curso) => curso.evaluaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_id' })
  curso!: CursoEntity;

  @OneToMany(() => NotaDetalleEntity, (nota) => nota.evaluacion)
  notasDetalle!: NotaDetalleEntity[];
}
