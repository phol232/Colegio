import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { CommonModule } from './common/common.module';
import { EtlModule } from './modules/etl/etl.module';
import { EtlProcessor } from './modules/etl/etl.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    CommonModule,
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
    EtlModule,
  ],
  providers: [EtlProcessor],
})
export class WorkerModule {}
