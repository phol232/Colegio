import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

// Evita aplicar migraciones OLTP en el worker (solo el API las corre).
process.env.WORKER_ROLE = '1';

async function bootstrap() {
  const logger = new Logger('OlapWorker');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'error', 'warn'],
  });

  app.enableShutdownHooks();
  logger.log('Worker OLAP sync iniciado (cola olap-sync)');
}

bootstrap().catch((err) => {
  console.error('Error iniciando worker:', err);
  process.exit(1);
});
