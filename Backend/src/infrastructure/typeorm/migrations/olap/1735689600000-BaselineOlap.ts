import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselineOlap1735689600000 implements MigrationInterface {
  name = 'BaselineOlap1735689600000';

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
      SELECT 'Baseline OLAP — esquema gestionado por schema_olap.sql'
      WHERE NOT EXISTS (SELECT 1 FROM typeorm_migrations_meta LIMIT 1)
    `);
  }

  public async down(): Promise<void> {
    // No revertir esquema completo en producción
  }
}
