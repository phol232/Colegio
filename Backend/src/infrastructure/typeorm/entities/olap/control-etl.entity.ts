import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('control_etl')
export class ControlEtlEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'proceso', type: 'varchar', length: 100 })
  proceso!: string;

  @Column({ name: 'ultima_ejecucion', type: 'timestamp', nullable: true })
  ultimaEjecucion!: Date | null;

  @Column({ name: 'estado', type: 'varchar', length: 50, nullable: true })
  estado!: string | null;

  @Column({ name: 'registros_procesados', type: 'int', nullable: true })
  registrosProcesados!: number | null;

  @Column({ name: 'errores', type: 'text', nullable: true })
  errores!: string | null;
}
