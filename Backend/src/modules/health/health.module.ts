import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { HealthController } from './presentation/health.controller';
import { HealthCheckUseCase } from './application/health-check.use-case';

@Module({
  imports: [CommonModule],
  controllers: [HealthController],
  providers: [HealthCheckUseCase],
})
export class HealthModule {}
