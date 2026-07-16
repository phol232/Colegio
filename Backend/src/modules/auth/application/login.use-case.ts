import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
} from '@/domain/ports/auth.repository.port';
import {
  MAINTENANCE_MESSAGE,
  MaintenanceService,
} from '@/common/services/maintenance.service';
import { LoginDto } from '../presentation/dto/login.dto';
import { AuthFunctionResult, toAuthFunctionResult } from '../domain/auth.types';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepo: IAuthRepository,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  async execute(dto: LoginDto): Promise<AuthFunctionResult> {
    const result = await this.authRepo.login(dto.email, dto.password);

    if (!result.success || !result.session) {
      return toAuthFunctionResult(result);
    }

    const maintenance = await this.maintenanceService.isActive();
    if (maintenance && result.session.role !== 'admin') {
      await this.authRepo.logout(result.session.token);
      return {
        success: false,
        message: MAINTENANCE_MESSAGE,
      };
    }

    return toAuthFunctionResult(result);
  }
}
