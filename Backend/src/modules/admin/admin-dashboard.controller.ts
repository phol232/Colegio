import {
  Body,
  Controller,
  Get,
  HttpCode,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthTokenGuard } from '../../common/guards/auth-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { ActualizarConfiguracionDto } from './dto/admin.dto';

@Controller('admin')
@UseGuards(AuthTokenGuard, RolesGuard)
@Roles('admin')
export class AdminDashboardController {
  constructor(private readonly adminService: AdminService) {}

  @Get('estadisticas')
  obtenerEstadisticas() {
    return this.adminService.obtenerEstadisticas();
  }

  @Get('secciones-info')
  obtenerSeccionesInfo() {
    return this.adminService.obtenerSeccionesInfo();
  }

  @Get('configuracion')
  getConfiguracion() {
    return this.adminService.getConfiguracion();
  }

  @Put('configuracion')
  @HttpCode(200)
  actualizarConfiguracion(@Body() dto: ActualizarConfiguracionDto) {
    return this.adminService.actualizarConfiguracion(dto);
  }
}
