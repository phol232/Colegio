import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminGradosController } from './admin-grados.controller';
import { AdminEstudiantesController } from './admin-estudiantes.controller';
import { AdminCatalogoController } from './admin-catalogo.controller';
import { AdminUsuariosController } from './admin-usuarios.controller';

@Module({
  controllers: [
    AdminDashboardController,
    AdminGradosController,
    AdminEstudiantesController,
    AdminCatalogoController,
    AdminUsuariosController,
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
