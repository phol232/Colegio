import { Injectable, Logger, Module, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { ScheduleModule, Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { CommonModule } from './common/common.module';
import { OLAP_SYNC_QUEUE } from './modules/etl/etl.processor';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '@/domain/ports/auth.repository.port';

@Injectable()
export class OlapSyncScheduler {
  private readonly logger = new Logger(OlapSyncScheduler.name);

  constructor(
    @InjectQueue(OLAP_SYNC_QUEUE) private readonly olapQueue: Queue,
  ) {}

  @Cron('0 */6 * * *')
  async enqueueIncremental() {
    this.logger.log('Encolando sync incremental OLAP (cada 6h)');
    await this.olapQueue.add(
      'incremental',
      { mode: 'incremental' as const },
      {
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: 2,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    );
  }

  @Cron('0 3 * * *')
  async enqueueFull() {
    this.logger.log('Encolando sync full OLAP (03:00)');
    await this.olapQueue.add(
      'full',
      { mode: 'full' as const },
      {
        removeOnComplete: 20,
        removeOnFail: 20,
        attempts: 1,
      },
    );
  }
}

@Injectable()
export class TokenCleanupScheduler {
  private readonly logger = new Logger(TokenCleanupScheduler.name);

  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: IAuthRepository,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens() {
    const removed = await this.authRepo.cleanupExpiredTokens();
    if (removed > 0) {
      this.logger.log(`Tokens expirados eliminados: ${removed}`);
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
    CommonModule,
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redisQueue.host'),
          port: config.get<number>('redisQueue.port'),
          db: config.get<number>('redisQueue.db'),
        },
      }),
    }),
    BullModule.registerQueue({ name: OLAP_SYNC_QUEUE }),
  ],
  providers: [OlapSyncScheduler, TokenCleanupScheduler],
})
export class SchedulerModule {}
