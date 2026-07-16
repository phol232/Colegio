import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_REPOSITORY,
  IAdminRepository,
} from '@/domain/ports/admin.repository.port';
import { CacheService } from '../redis/cache.service';

const MAINTENANCE_CACHE_KEY = 'system:maintenance';
const MAINTENANCE_CACHE_TTL = 30;

export const MAINTENANCE_MESSAGE =
  'El sistema está en modo mantenimiento. Solo administradores pueden acceder.';

@Injectable()
export class MaintenanceService {
  constructor(
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepo: IAdminRepository,
    private readonly cache: CacheService,
  ) {}

  async isActive(): Promise<boolean> {
    return this.cache.remember(MAINTENANCE_CACHE_KEY, MAINTENANCE_CACHE_TTL, async () => {
      const config = await this.adminRepo.getConfiguracion();
      return config?.modoMantenimiento ?? false;
    });
  }

  async invalidateCache(): Promise<void> {
    await this.cache.del(MAINTENANCE_CACHE_KEY);
  }

  assertAccessAllowed(role: string): void {
    if (role !== 'admin') {
      throw new ForbiddenException({
        message: MAINTENANCE_MESSAGE,
        code: 'MAINTENANCE_MODE',
      });
    }
  }

  async assertAccessAllowedIfActive(role: string): Promise<void> {
    const active = await this.isActive();
    if (active) {
      this.assertAccessAllowed(role);
    }
  }
}
