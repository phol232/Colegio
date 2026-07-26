import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const ANALISIS_VERSION_KEY = 'analisis:version';

@Injectable()
export class CacheService implements OnModuleDestroy {
  constructor(@Inject('CACHE_REDIS') private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  authTokenKey(token: string): string {
    return `auth:token:${token}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (value == null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);

    if (ttlSeconds != null && ttlSeconds > 0) {
      await this.redis.set(key, serialized, 'EX', ttlSeconds);
      return;
    }

    await this.redis.set(key, serialized);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delByPattern(pattern: string): Promise<number> {
    let cursor = '0';
    let deleted = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        deleted += await this.redis.del(...keys);
      }
    } while (cursor !== '0');

    return deleted;
  }

  async getAnalisisVersion(): Promise<number> {
    const raw = await this.redis.get(ANALISIS_VERSION_KEY);
    return Number(raw ?? 0);
  }

  async bumpAnalisisVersion(): Promise<number> {
    return this.redis.incr(ANALISIS_VERSION_KEY);
  }

  /**
   * Cache-aside versionado: la clave incluye analisis:version.
   * Un INCR deja obsoleta toda la caché sin SCAN.
   */
  async rememberVersioned<T>(
    namespace: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const version = await this.getAnalisisVersion();
    const key = `analisis:v${version}:${namespace}`;
    return this.remember(key, ttlSeconds, factory);
  }

  async remember<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached != null) {
      return cached;
    }

    const lockKey = `lock:${key}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');

    if (acquired !== 'OK') {
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 50));
        const again = await this.get<T>(key);
        if (again != null) {
          return again;
        }
      }
      // Timeout: recalcular igual (mejor servir dato que fallar)
      const value = await factory();
      await this.set(key, value, ttlSeconds);
      return value;
    }

    try {
      const again = await this.get<T>(key);
      if (again != null) {
        return again;
      }
      const value = await factory();
      await this.set(key, value, ttlSeconds);
      return value;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async invalidateAuthToken(token: string): Promise<void> {
    await this.del(this.authTokenKey(token));
  }
}
