import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';

export const CACHE_REDIS = 'CACHE_REDIS';
export const QUEUE_REDIS = 'QUEUE_REDIS';

@Global()
@Module({
  providers: [
    {
      provide: CACHE_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get<string>('redisCache.host'),
          port: config.get<number>('redisCache.port'),
          db: config.get<number>('redisCache.db'),
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
          lazyConnect: false,
        }),
    },
    {
      provide: QUEUE_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        host: config.get<string>('redisQueue.host'),
        port: config.get<number>('redisQueue.port'),
        db: config.get<number>('redisQueue.db'),
        maxRetriesPerRequest: null,
      }),
    },
    CacheService,
  ],
  exports: [CACHE_REDIS, QUEUE_REDIS, CacheService],
})
export class RedisModule {}
