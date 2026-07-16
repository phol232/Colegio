import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FactRendimientoEstudiantilEntity } from './fact-rendimiento-estudiantil.entity';

@Entity('dim_estudiante')
@Index('idx_dim_est_id', ['estudianteId'])
export class DimEstudianteEntity {
  @PrimaryGeneratedColumn({ name: 'estudiante_key' })
  estudianteKey!: number;

  @Column({ name: 'estudiante_id', type: 'bigint', unique: true })
  estudianteId!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 255 })
  nombre!: string;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email!: string;

  @CreateDateColumn({ name: 'fecha_carga', type: 'timestamp' })
  fechaCarga!: Date;

  @OneToMany(() => FactRendimientoEstudiantilEntity, (fact) => fact.estudiante)
  hechos!: FactRendimientoEstudiantilEntity[];
}
