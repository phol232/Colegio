import { Controller, Get, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { MaintenanceService } from '../../../common/services/maintenance.service';
import { HealthCheckUseCase } from '../application/health-check.use-case';

@Controller('health')
@Public()
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly healthCheck: HealthCheckUseCase,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const { result, httpStatus } = await this.healthCheck.execute();
    res.status(httpStatus);
    return result;
  }

  @Get('mantenimiento')
  async mantenimiento() {
    const activo = await this.maintenanceService.isActive();
    return {
      success: true,
      data: { modo_mantenimiento: activo },
    };
  }
}
