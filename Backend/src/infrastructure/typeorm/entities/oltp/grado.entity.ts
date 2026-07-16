import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { SeccionEntity } from './seccion.entity';
import { CursoEntity } from './curso.entity';

export type NivelEducativo = 'primaria' | 'secundaria';

@Entity('grados')
@Unique(['nivel', 'numero'])
@Index('idx_grados_nivel', ['nivel'])
export class GradoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'nivel', type: 'varchar', length: 255 })
  nivel!: NivelEducativo;

  @Column({ name: 'numero', type: 'smallint' })
  numero!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 255 })
  nombre!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => SeccionEntity, (seccion) => seccion.grado)
  secciones!: SeccionEntity[];

  @OneToMany(() => CursoEntity, (curso) => curso.grado)
  cursos!: CursoEntity[];

  @OneToMany('UsuarioEntity', 'grado')
  usuarios!: import('./usuario.entity').UsuarioEntity[];
}
