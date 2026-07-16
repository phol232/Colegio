import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FactRendimientoEstudiantilEntity } from './fact-rendimiento-estudiantil.entity';

@Entity('dim_docente')
@Index('idx_dim_docente_id', ['docenteId'])
export class DimDocenteEntity {
  @PrimaryGeneratedColumn({ name: 'docente_key' })
  docenteKey!: number;

  @Column({ name: 'docente_id', type: 'bigint', unique: true })
  docenteId!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 255 })
  nombre!: string;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email!: string;

  @CreateDateColumn({ name: 'fecha_carga', type: 'timestamp' })
  fechaCarga!: Date;

  @OneToMany(() => FactRendimientoEstudiantilEntity, (fact) => fact.docente)
  hechos!: FactRendimientoEstudiantilEntity[];
}
