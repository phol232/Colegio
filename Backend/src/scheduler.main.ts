import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SchedulerModule } from './scheduler.module';

async function bootstrap() {
  const logger = new Logger('OlapScheduler');
  const app = await NestFactory.createApplicationContext(SchedulerModule, {
    logger: ['log', 'error', 'warn'],
  });

  app.enableShutdownHooks();
  logger.log(
    'Scheduler OLAP iniciado (incremental cada hora, full 03:00)',
  );
}

bootstrap().catch((err) => {
  console.error('Error iniciando scheduler:', err);
  process.exit(1);
});
