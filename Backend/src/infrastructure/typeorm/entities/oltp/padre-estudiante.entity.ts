import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UsuarioEntity } from './usuario.entity';

@Entity('padres_estudiantes')
@Unique(['padreId', 'estudianteId'])
@Index('idx_padres_est_padre', ['padreId'])
export class PadreEstudianteEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'padre_id', type: 'bigint' })
  padreId!: number;

  @Column({ name: 'estudiante_id', type: 'bigint' })
  estudianteId!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => UsuarioEntity, (usuario) => usuario.hijos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'padre_id' })
  padre!: UsuarioEntity;

  @ManyToOne(() => UsuarioEntity, (usuario) => usuario.padres, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante!: UsuarioEntity;
}
