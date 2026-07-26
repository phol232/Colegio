import { Injectable, Logger, Module, Inject } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule, Cron, CronExpression } from '@nestjs/schedule';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { CommonModule } from './common/common.module';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '@/domain/ports/auth.repository.port';

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
    CommonModule,
    ScheduleModule.forRoot(),
  ],
  providers: [TokenCleanupScheduler],
})
export class SchedulerModule {}
