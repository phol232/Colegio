import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '@/domain/ports/auth.repository.port';
import { CacheService } from '../../../common/redis/cache.service';
import { AuthFunctionResult } from '../domain/auth.types';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepo: IAuthRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(token: string): Promise<AuthFunctionResult> {
    await this.authRepo.logout(token);
    await this.cache.invalidateAuthToken(token);
    return { success: true, message: 'Sesión cerrada' };
  }
}
