import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type PeriodoEstado = 'planificacion' | 'matricula' | 'activo' | 'cerrado';

@Entity('periodos_academicos')
@Unique(['anio'])
@Index('idx_periodos_estado', ['estado'])
export class PeriodoAcademicoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'anio', type: 'smallint' })
  anio!: number;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'planificacion' })
  estado!: PeriodoEstado;

  @Column({ name: 'matricula_inicio', type: 'date', nullable: true })
  matriculaInicio!: string | null;

  @Column({ name: 'matricula_fin', type: 'date', nullable: true })
  matriculaFin!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
