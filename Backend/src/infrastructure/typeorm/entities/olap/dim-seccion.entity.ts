import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DimGradoEntity } from './dim-grado.entity';
import { FactRendimientoEstudiantilEntity } from './fact-rendimiento-estudiantil.entity';

@Entity('dim_seccion')
@Index('idx_dim_seccion_id', ['seccionId'])
@Index('idx_dim_seccion_grado', ['gradoKey'])
export class DimSeccionEntity {
  @PrimaryGeneratedColumn({ name: 'seccion_key' })
  seccionKey!: number;

  @Column({ name: 'seccion_id', type: 'bigint', unique: true })
  seccionId!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 10 })
  nombre!: string;

  @Column({ name: 'grado_key', type: 'int' })
  gradoKey!: number;

  @Column({ name: 'grado_nombre', type: 'varchar', length: 255, nullable: true })
  gradoNombre!: string | null;

  @CreateDateColumn({ name: 'fecha_carga', type: 'timestamp' })
  fechaCarga!: Date;

  @ManyToOne(() => DimGradoEntity, (grado) => grado.secciones)
  @JoinColumn({ name: 'grado_key' })
  grado!: DimGradoEntity;

  @OneToMany(() => FactRendimientoEstudiantilEntity, (fact) => fact.seccion)
  hechos!: FactRendimientoEstudiantilEntity[];
}
