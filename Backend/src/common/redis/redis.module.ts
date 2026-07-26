import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';

export const CACHE_REDIS = 'CACHE_REDIS';

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
    CacheService,
  ],
  exports: [CACHE_REDIS, CacheService],
})
export class RedisModule {}
