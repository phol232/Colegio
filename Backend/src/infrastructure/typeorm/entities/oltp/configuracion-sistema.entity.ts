import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('configuracion_sistema')
export class ConfiguracionSistemaEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'nombre_institucion', type: 'varchar', length: 255, default: 'Colegio Frederick' })
  nombreInstitucion!: string;

  @Column({ name: 'anio_academico', type: 'smallint' })
  anioAcademico!: number;

  @Column({ name: 'periodo_evaluacion', type: 'varchar', length: 50, default: 'trimestral' })
  periodoEvaluacion!: string;

  @Column({ name: 'modo_mantenimiento', type: 'boolean', default: false })
  modoMantenimiento!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
