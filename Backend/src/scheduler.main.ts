import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SchedulerModule } from './scheduler.module';

// Evita aplicar migraciones OLTP en el scheduler (solo el API las corre).
process.env.SCHEDULER_ROLE = '1';

async function bootstrap() {
  const logger = new Logger('Scheduler');
  const app = await NestFactory.createApplicationContext(SchedulerModule, {
    logger: ['log', 'error', 'warn'],
  });

  app.enableShutdownHooks();
  logger.log('Scheduler iniciado (limpieza de tokens cada hora)');
}

bootstrap().catch((err) => {
  console.error('Error iniciando scheduler:', err);
  process.exit(1);
});
