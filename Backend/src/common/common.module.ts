import { Global, Module } from '@nestjs/common';
import { AppTypeOrmModule } from '@/infrastructure/typeorm/typeorm.module';
import { RedisModule } from './redis/redis.module';
import { AuthTokenGuard } from './guards/auth-token.guard';
import { MaintenanceGuard } from './guards/maintenance.guard';
import { RolesGuard } from './guards/roles.guard';
import { MaintenanceService } from './services/maintenance.service';

@Global()
@Module({
  imports: [RedisModule, AppTypeOrmModule],
  providers: [AuthTokenGuard, MaintenanceGuard, MaintenanceService, RolesGuard],
  exports: [
    RedisModule,
    AppTypeOrmModule,
    AuthTokenGuard,
    MaintenanceGuard,
    MaintenanceService,
    RolesGuard,
  ],
})
export class CommonModule {}
