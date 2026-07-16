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

export type EstadoAsistencia = 'presente' | 'ausente' | 'tardanza';

@Entity('asistencias')
@Unique(['estudianteId', 'cursoId', 'fecha'])
@Index('idx_asistencias_estudiante', ['estudianteId'])
@Index('idx_asistencias_curso', ['cursoId'])
@Index('idx_asistencias_fecha', ['fecha'])
@Index('idx_asistencias_compuesto', ['cursoId', 'fecha'])
export class AsistenciaEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'estudiante_id', type: 'bigint' })
  estudianteId!: number;

  @Column({ name: 'curso_id', type: 'bigint' })
  cursoId!: number;

  @Column({ name: 'fecha', type: 'date' })
  fecha!: string;

  @Column({ name: 'estado', type: 'varchar', length: 20 })
  estado!: EstadoAsistencia;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => UsuarioEntity, (usuario) => usuario.asistencias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante!: UsuarioEntity;

  @ManyToOne(() => CursoEntity, (curso) => curso.asistencias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_id' })
  curso!: CursoEntity;
}
