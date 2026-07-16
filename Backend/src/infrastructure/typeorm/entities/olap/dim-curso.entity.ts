import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FactRendimientoEstudiantilEntity } from './fact-rendimiento-estudiantil.entity';

@Entity('dim_curso')
@Index('idx_dim_curso_id', ['cursoId'])
export class DimCursoEntity {
  @PrimaryGeneratedColumn({ name: 'curso_key' })
  cursoKey!: number;

  @Column({ name: 'curso_id', type: 'bigint', unique: true })
  cursoId!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 255 })
  nombre!: string;

  @Column({ name: 'codigo', type: 'varchar', length: 50 })
  codigo!: string;

  @Column({ name: 'docente_nombre', type: 'varchar', length: 255, nullable: true })
  docenteNombre!: string | null;

  @Column({ name: 'grado_nombre', type: 'varchar', length: 255, nullable: true })
  gradoNombre!: string | null;

  @Column({ name: 'seccion_nombre', type: 'varchar', length: 255, nullable: true })
  seccionNombre!: string | null;

  @CreateDateColumn({ name: 'fecha_carga', type: 'timestamp' })
  fechaCarga!: Date;

  @OneToMany(() => FactRendimientoEstudiantilEntity, (fact) => fact.curso)
  hechos!: FactRendimientoEstudiantilEntity[];
}
