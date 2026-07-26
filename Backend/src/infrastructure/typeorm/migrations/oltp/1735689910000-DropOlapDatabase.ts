import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Elimina la base academic_olap (ya no se usa: el análisis lee de OLTP).
 * DROP DATABASE no puede ir dentro de una transacción.
 * Fuente: Database/scripts/drop-olap.sql
 *
 * Nota: vía PgBouncer (pool_mode=transaction) a menudo se rechaza DROP DATABASE.
 * En ese caso no falla el arranque; se puede ejecutar a mano contra Postgres :5432.
 */
export class DropOlapDatabase1735689910000 implements MigrationInterface {
  name = 'DropOlapDatabase1735689910000';

  /** Obligatorio: PostgreSQL rechaza DROP DATABASE dentro de un bloque transaccional. */
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing: Array<{ ok: number }> = await queryRunner.query(
      `SELECT 1 AS ok FROM pg_database WHERE datname = 'academic_olap'`,
    );
    if (existing.length === 0) {
      return;
    }

    try {
      await queryRunner.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = 'academic_olap' AND pid <> pg_backend_pid()
      `);
      await queryRunner.query(`DROP DATABASE IF EXISTS academic_olap`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.warn(
        `[DropOlapDatabase] No se pudo DROP academic_olap (¿PgBouncer?). ` +
          `Ejecuta Database/scripts/drop-olap.sql contra Postgres :5432. ` +
          `Detalle: ${message}`,
      );
    }
  }

  public async down(): Promise<void> {
    // No recreamos academic_olap: el esquema OLAP fue retirado del repo.
  }
}
