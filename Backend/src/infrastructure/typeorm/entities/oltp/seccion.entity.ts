import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { GradoEntity } from './grado.entity';
import { CursoEntity } from './curso.entity';

@Entity('secciones')
@Unique(['gradoId', 'nombre'])
@Index('idx_secciones_grado', ['gradoId'])
export class SeccionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'grado_id', type: 'bigint' })
  gradoId!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 10 })
  nombre!: string;

  @Column({ name: 'capacidad', type: 'int', default: 30 })
  capacidad!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => GradoEntity, (grado) => grado.secciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grado_id' })
  grado!: GradoEntity;

  @OneToMany(() => CursoEntity, (curso) => curso.seccion)
  cursos!: CursoEntity[];

  @OneToMany('UsuarioEntity', 'seccion')
  usuarios!: import('./usuario.entity').UsuarioEntity[];
}
