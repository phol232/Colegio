import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FactRendimientoEstudiantilEntity } from './fact-rendimiento-estudiantil.entity';

@Entity('dim_tiempo')
@Index('idx_dim_tiempo_fecha', ['fecha'])
@Index('idx_dim_tiempo_anio_mes', ['anio', 'mes'])
export class DimTiempoEntity {
  @PrimaryGeneratedColumn({ name: 'tiempo_key' })
  tiempoKey!: number;

  @Column({ name: 'fecha', type: 'date', unique: true })
  fecha!: string;

  @Column({ name: 'dia', type: 'smallint' })
  dia!: number;

  @Column({ name: 'mes', type: 'smallint' })
  mes!: number;

  @Column({ name: 'anio', type: 'smallint' })
  anio!: number;

  @Column({ name: 'trimestre', type: 'smallint' })
  trimestre!: number;

  @Column({ name: 'semestre', type: 'smallint' })
  semestre!: number;

  @Column({ name: 'dia_semana', type: 'smallint' })
  diaSemana!: number;

  @Column({ name: 'nombre_mes', type: 'varchar', length: 20, nullable: true })
  nombreMes!: string | null;

  @Column({ name: 'nombre_dia', type: 'varchar', length: 20, nullable: true })
  nombreDia!: string | null;

  @OneToMany(() => FactRendimientoEstudiantilEntity, (fact) => fact.tiempo)
  hechos!: FactRendimientoEstudiantilEntity[];
}
