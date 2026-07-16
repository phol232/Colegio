import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DimSeccionEntity } from './dim-seccion.entity';
import { FactRendimientoEstudiantilEntity } from './fact-rendimiento-estudiantil.entity';

@Entity('dim_grado')
@Index('idx_dim_grado_id', ['gradoId'])
@Index('idx_dim_grado_nivel', ['nivel'])
export class DimGradoEntity {
  @PrimaryGeneratedColumn({ name: 'grado_key' })
  gradoKey!: number;

  @Column({ name: 'grado_id', type: 'bigint', unique: true })
  gradoId!: number;

  @Column({ name: 'nivel', type: 'varchar', length: 255 })
  nivel!: string;

  @Column({ name: 'numero', type: 'smallint' })
  numero!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 255 })
  nombre!: string;

  @CreateDateColumn({ name: 'fecha_carga', type: 'timestamp' })
  fechaCarga!: Date;

  @OneToMany(() => DimSeccionEntity, (seccion) => seccion.grado)
  secciones!: DimSeccionEntity[];

  @OneToMany(() => FactRendimientoEstudiantilEntity, (fact) => fact.grado)
  hechos!: FactRendimientoEstudiantilEntity[];
}
