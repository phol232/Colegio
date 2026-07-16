import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthTokenGuard } from '../../common/guards/auth-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import {
  ActualizarGradoDto,
  ActualizarSeccionDto,
  CrearGradoDto,
  CrearSeccionDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(AuthTokenGuard, RolesGuard)
@Roles('admin')
export class AdminGradosController {
  constructor(private readonly adminService: AdminService) {}

  @Get('grados')
  listarGrados() {
    return this.adminService.listarGrados();
  }

  @Post('grados')
  @HttpCode(201)
  crearGrado(@Body() dto: CrearGradoDto) {
    return this.adminService.crearGrado(dto);
  }

  @Put('grados/:id')
  actualizarGrado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarGradoDto,
  ) {
    return this.adminService.actualizarGrado(id, dto);
  }

  @Delete('grados/:id')
  eliminarGrado(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.eliminarGrado(id);
  }

  @Get('grados/:gradoId/secciones')
  listarSecciones(@Param('gradoId', ParseIntPipe) gradoId: number) {
    return this.adminService.listarSeccionesGrado(gradoId);
  }

  @Post('grados/:gradoId/secciones')
  @HttpCode(201)
  crearSeccion(
    @Param('gradoId', ParseIntPipe) gradoId: number,
    @Body() dto: CrearSeccionDto,
  ) {
    return this.adminService.crearSeccion(gradoId, dto);
  }

  @Put('secciones/:id')
  actualizarSeccion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarSeccionDto,
  ) {
    return this.adminService.actualizarSeccion(id, dto);
  }

  @Delete('secciones/:id')
  eliminarSeccion(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.eliminarSeccion(id);
  }
}
