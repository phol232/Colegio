import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notas')
@Index('idx_notas_compuesto', ['cursoId', 'unidad'])
export class NotaLegacyEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'estudiante_id', type: 'bigint' })
  @Index('idx_notas_estudiante')
  estudianteId!: number;

  @Column({ name: 'curso_id', type: 'bigint' })
  @Index('idx_notas_curso')
  cursoId!: number;

  @Column({ type: 'smallint' })
  unidad!: number;

  @Column({ type: 'decimal', precision: 4, scale: 2 })
  puntaje!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
