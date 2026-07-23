import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UsuarioEntity } from './usuario.entity';
import { PeriodoAcademicoEntity } from './periodo-academico.entity';
import { GradoEntity } from './grado.entity';
import { SeccionEntity } from './seccion.entity';
import { EstudianteCursoEntity } from './estudiante-curso.entity';
import { DecisionPromocionEntity } from './decision-promocion.entity';

export type MatriculaEstado = 'pendiente' | 'activa' | 'rechazada' | 'retirada';
export type MatriculaTipo = 'ingreso' | 'continuidad' | 'repeticion' | 'traslado';
export type MatriculaOrigen = 'estudiante' | 'admin' | 'migracion';

@Entity('matriculas')
@Unique('uk_matricula_estudiante_periodo', ['estudianteId', 'periodoAcademicoId'])
@Index('idx_matriculas_periodo', ['periodoAcademicoId'])
@Index('idx_matriculas_estado', ['estado'])
@Index('idx_matriculas_grado', ['gradoId'])
@Index('idx_matriculas_seccion', ['seccionId'])
export class MatriculaEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'estudiante_id', type: 'bigint' })
  estudianteId!: number;

  @Column({ name: 'periodo_academico_id', type: 'bigint' })
  periodoAcademicoId!: number;

  @Column({ name: 'grado_id', type: 'bigint' })
  gradoId!: number;

  @Column({ name: 'seccion_id', type: 'bigint', nullable: true })
  seccionId!: number | null;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'pendiente' })
  estado!: MatriculaEstado;

  @Column({ name: 'tipo', type: 'varchar', length: 20 })
  tipo!: MatriculaTipo;

  @Column({ name: 'origen', type: 'varchar', length: 20, default: 'estudiante' })
  origen!: MatriculaOrigen;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ name: 'solicitado_por', type: 'bigint', nullable: true })
  solicitadoPor!: number | null;

  @Column({ name: 'confirmado_por', type: 'bigint', nullable: true })
  confirmadoPor!: number | null;

  @Column({ name: 'confirmado_at', type: 'timestamp', nullable: true })
  confirmadoAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante!: UsuarioEntity;

  @ManyToOne(() => PeriodoAcademicoEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'periodo_academico_id' })
  periodoAcademico!: PeriodoAcademicoEntity;

  @ManyToOne(() => GradoEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grado_id' })
  grado!: GradoEntity;

  @ManyToOne(() => SeccionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'seccion_id' })
  seccion!: SeccionEntity | null;

  @OneToMany(() => EstudianteCursoEntity, (ec) => ec.matricula)
  estudiantesCursos!: EstudianteCursoEntity[];

  @OneToOne(() => DecisionPromocionEntity, (d) => d.matriculaOrigen)
  decisionPromocion!: DecisionPromocionEntity | null;
}
