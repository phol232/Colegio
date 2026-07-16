import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UsuarioEntity } from './usuario.entity';
import { GradoEntity } from './grado.entity';
import { SeccionEntity } from './seccion.entity';
import { CursoCatalogoEntity } from './curso-catalogo.entity';
import { EstudianteCursoEntity } from './estudiante-curso.entity';
import { AsistenciaEntity } from './asistencia.entity';
import { EvaluacionEntity } from './evaluacion.entity';
import { PromedioUnidadEntity } from './promedio-unidad.entity';

@Entity('cursos')
@Index('idx_cursos_docente', ['docenteId'])
@Index('idx_cursos_grado', ['gradoId'])
@Index('idx_cursos_seccion', ['seccionId'])
@Index('idx_cursos_catalogo', ['cursoCatalogoId'])
export class CursoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'docente_id', type: 'bigint' })
  docenteId!: number;

  @Column({ name: 'grado_id', type: 'bigint', nullable: true })
  gradoId!: number | null;

  @Column({ name: 'seccion_id', type: 'bigint', nullable: true })
  seccionId!: number | null;

  @Column({ name: 'curso_catalogo_id', type: 'bigint' })
  cursoCatalogoId!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => UsuarioEntity, (usuario) => usuario.cursosDocente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'docente_id' })
  docente!: UsuarioEntity;

  @ManyToOne(() => GradoEntity, (grado) => grado.cursos, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'grado_id' })
  grado!: GradoEntity | null;

  @ManyToOne(() => SeccionEntity, (seccion) => seccion.cursos, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'seccion_id' })
  seccion!: SeccionEntity | null;

  @ManyToOne(() => CursoCatalogoEntity, (catalogo) => catalogo.cursos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_catalogo_id' })
  cursoCatalogo!: CursoCatalogoEntity;

  @OneToMany(() => EstudianteCursoEntity, (ec) => ec.curso)
  estudiantesCursos!: EstudianteCursoEntity[];

  @OneToMany(() => AsistenciaEntity, (asistencia) => asistencia.curso)
  asistencias!: AsistenciaEntity[];

  @OneToMany(() => EvaluacionEntity, (evaluacion) => evaluacion.curso)
  evaluaciones!: EvaluacionEntity[];

  @OneToMany(() => PromedioUnidadEntity, (promedio) => promedio.curso)
  promediosUnidad!: PromedioUnidadEntity[];
}
