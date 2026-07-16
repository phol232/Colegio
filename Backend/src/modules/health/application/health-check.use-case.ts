import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import {
  OLAP_CONNECTION,
  OLTP_CONNECTION,
} from '@/infrastructure/typeorm/repositories';
import { CACHE_REDIS } from '@/common/redis/redis.module';

export type HealthCheckStatus = 'ok' | 'down';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  checks: {
    database_oltp: HealthCheckStatus;
    database_olap: HealthCheckStatus;
    redis: HealthCheckStatus;
  };
}

@Injectable()
export class HealthCheckUseCase {
  constructor(
    @InjectDataSource(OLTP_CONNECTION)
    private readonly oltpDataSource: DataSource,
    @InjectDataSource(OLAP_CONNECTION)
    private readonly olapDataSource: DataSource,
    @Inject(CACHE_REDIS) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async execute(): Promise<{ result: HealthCheckResult; httpStatus: number }> {
    const checks: HealthCheckResult['checks'] = {
      database_oltp: 'down',
      database_olap: 'down',
      redis: 'down',
    };

    try {
      await this.oltpDataSource.query('SELECT 1');
      checks.database_oltp = 'ok';
    } catch {
      checks.database_oltp = 'down';
    }

    try {
      await this.olapDataSource.query('SELECT 1');
      checks.database_olap = 'ok';
    } catch {
      checks.database_olap = 'down';
    }

    try {
      const pong = await this.redis.ping();
      checks.redis = pong === 'PONG' ? 'ok' : 'down';
    } catch {
      checks.redis = 'down';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');

    const result: HealthCheckResult = {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service:
        this.config.get<string>('appName') ?? 'Academic Management API',
      version: this.config.get<string>('appVersion') ?? '1.0.0',
      checks,
    };

    return {
      result,
      httpStatus: healthy ? 200 : 503,
    };
  }
}
