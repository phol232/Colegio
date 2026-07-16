import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline: el esquema OLTP se aplica vía Database/apply-all.sql o Docker init.
 * Esta migración registra el punto de corte TypeORM sin recrear tablas existentes.
 */
export class BaselineOltp1735689600000 implements MigrationInterface {
  name = 'BaselineOltp1735689600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS typeorm_migrations_meta (
        id SERIAL PRIMARY KEY,
        note TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      INSERT INTO typeorm_migrations_meta (note)
      SELECT 'Baseline OLTP — esquema gestionado por apply-all.sql'
      WHERE NOT EXISTS (SELECT 1 FROM typeorm_migrations_meta LIMIT 1)
    `);
  }

  public async down(): Promise<void> {
    // No revertir esquema completo en producción
  }
}
