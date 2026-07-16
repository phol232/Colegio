import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CursoEntity } from './curso.entity';

export type NivelCatalogo = 'primaria' | 'secundaria' | 'ambos';

@Entity('cursos_catalogo')
export class CursoCatalogoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 100, unique: true })
  nombre!: string;

  @Column({ name: 'codigo', type: 'varchar', length: 20, unique: true })
  codigo!: string;

  @Column({ name: 'nivel', type: 'varchar', length: 20, default: 'ambos' })
  nivel!: NivelCatalogo;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => CursoEntity, (curso) => curso.cursoCatalogo)
  cursos!: CursoEntity[];
}
