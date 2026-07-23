import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { MatriculaEntity } from './matricula.entity';
import { GradoEntity } from './grado.entity';
import { UsuarioEntity } from './usuario.entity';

export type ResultadoPromocion = 'promovido' | 'repite' | 'egresado';

@Entity('decisiones_promocion')
@Unique('uk_decision_matricula_origen', ['matriculaOrigenId'])
@Index('idx_decisiones_resultado', ['resultado'])
export class DecisionPromocionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'matricula_origen_id', type: 'bigint' })
  matriculaOrigenId!: number;

  @Column({ name: 'resultado', type: 'varchar', length: 20 })
  resultado!: ResultadoPromocion;

  @Column({ name: 'grado_destino_id', type: 'bigint', nullable: true })
  gradoDestinoId!: number | null;

  @Column({ name: 'motivo', type: 'text', nullable: true })
  motivo!: string | null;

  @Column({ name: 'registrado_por', type: 'bigint', nullable: true })
  registradoPor!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @OneToOne(() => MatriculaEntity, (m) => m.decisionPromocion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matricula_origen_id' })
  matriculaOrigen!: MatriculaEntity;

  @ManyToOne(() => GradoEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'grado_destino_id' })
  gradoDestino!: GradoEntity | null;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'registrado_por' })
  registradoPorUsuario!: UsuarioEntity | null;
}
