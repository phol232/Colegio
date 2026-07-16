import { Module } from '@nestjs/common';
import { NotasDetalleController } from './notas-detalle.controller';
import { NotasDetalleService } from './application/notas-detalle.service';

@Module({
  controllers: [NotasDetalleController],
  providers: [NotasDetalleService],
  exports: [NotasDetalleService],
})
export class NotasDetalleModule {}
