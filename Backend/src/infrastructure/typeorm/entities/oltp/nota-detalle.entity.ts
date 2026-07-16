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
import { EvaluacionEntity } from './evaluacion.entity';
import { UsuarioEntity } from './usuario.entity';

@Entity('notas_detalle')
@Unique('uk_nota_evaluacion_estudiante', ['evaluacionId', 'estudianteId'])
@Index('idx_notas_detalle_estudiante', ['estudianteId'])
@Index('idx_notas_detalle_evaluacion', ['evaluacionId'])
export class NotaDetalleEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'evaluacion_id', type: 'bigint' })
  evaluacionId!: number;

  @Column({ name: 'estudiante_id', type: 'bigint' })
  estudianteId!: number;

  @Column({ name: 'puntaje', type: 'decimal', precision: 4, scale: 2 })
  puntaje!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => EvaluacionEntity, (evaluacion) => evaluacion.notasDetalle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluacion_id' })
  evaluacion!: EvaluacionEntity;

  @ManyToOne(() => UsuarioEntity, (usuario) => usuario.notasDetalle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante!: UsuarioEntity;
}
