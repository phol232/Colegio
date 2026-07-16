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
import { GradoEntity } from './grado.entity';
import { SeccionEntity } from './seccion.entity';
import { AuthTokenEntity } from './auth-token.entity';
import { CursoEntity } from './curso.entity';
import { EstudianteCursoEntity } from './estudiante-curso.entity';
import { AsistenciaEntity } from './asistencia.entity';
import { NotaDetalleEntity } from './nota-detalle.entity';
import { PromedioUnidadEntity } from './promedio-unidad.entity';
import { PadreEstudianteEntity } from './padre-estudiante.entity';

export type UsuarioRole = 'docente' | 'estudiante' | 'padre' | 'admin';

@Entity('usuarios')
@Index('idx_usuarios_role', ['role'])
@Index('idx_usuarios_google_id', ['googleId'])
@Index('idx_usuarios_dni', ['dni'])
@Index('idx_usuarios_grado', ['gradoId'])
@Index('idx_usuarios_seccion', ['seccionId'])
export class UsuarioEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'email', type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'dni', type: 'varchar', length: 20, unique: true, nullable: true })
  dni!: string | null;

  @Column({ name: 'telefono', type: 'varchar', length: 20, nullable: true })
  telefono!: string | null;

  @Column({ name: 'direccion', type: 'text', nullable: true })
  direccion!: string | null;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'google_id', type: 'varchar', length: 255, unique: true, nullable: true })
  googleId!: string | null;

  @Column({ name: 'password', type: 'varchar', length: 255 })
  password!: string;

  @Column({ name: 'role', type: 'varchar', length: 50 })
  role!: UsuarioRole;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo!: boolean;

  @Column({ name: 'avatar', type: 'text', nullable: true })
  avatar!: string | null;

  @Column({ name: 'grado_id', type: 'bigint', nullable: true })
  gradoId!: number | null;

  @Column({ name: 'seccion_id', type: 'bigint', nullable: true })
  seccionId!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => GradoEntity, (grado) => grado.usuarios, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'grado_id' })
  grado!: GradoEntity | null;

  @ManyToOne(() => SeccionEntity, (seccion) => seccion.usuarios, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'seccion_id' })
  seccion!: SeccionEntity | null;

  @OneToMany(() => AuthTokenEntity, (token) => token.usuario)
  authTokens!: AuthTokenEntity[];

  @OneToMany(() => CursoEntity, (curso) => curso.docente)
  cursosDocente!: CursoEntity[];

  @OneToMany(() => EstudianteCursoEntity, (ec) => ec.estudiante)
  matriculas!: EstudianteCursoEntity[];

  @OneToMany(() => AsistenciaEntity, (asistencia) => asistencia.estudiante)
  asistencias!: AsistenciaEntity[];

  @OneToMany(() => NotaDetalleEntity, (nota) => nota.estudiante)
  notasDetalle!: NotaDetalleEntity[];

  @OneToMany(() => PromedioUnidadEntity, (promedio) => promedio.estudiante)
  promediosUnidad!: PromedioUnidadEntity[];

  @OneToMany(() => PadreEstudianteEntity, (pe) => pe.padre)
  hijos!: PadreEstudianteEntity[];

  @OneToMany(() => PadreEstudianteEntity, (pe) => pe.estudiante)
  padres!: PadreEstudianteEntity[];
}
