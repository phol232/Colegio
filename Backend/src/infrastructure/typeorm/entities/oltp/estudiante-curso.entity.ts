import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UsuarioEntity } from './usuario.entity';
import { CursoEntity } from './curso.entity';

@Entity('estudiantes_cursos')
@Unique(['estudianteId', 'cursoId'])
@Index('idx_est_cursos_estudiante', ['estudianteId'])
@Index('idx_est_cursos_curso', ['cursoId'])
@Index('idx_est_cursos_anio', ['anioAcademico'])
export class EstudianteCursoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'estudiante_id', type: 'bigint' })
  estudianteId!: number;

  @Column({ name: 'curso_id', type: 'bigint' })
  cursoId!: number;

  @Column({ name: 'fecha_matricula', type: 'date' })
  fechaMatricula!: string;

  @Column({ name: 'anio_academico', type: 'smallint' })
  anioAcademico!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => UsuarioEntity, (usuario) => usuario.matriculas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante!: UsuarioEntity;

  @ManyToOne(() => CursoEntity, (curso) => curso.estudiantesCursos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_id' })
  curso!: CursoEntity;
}
