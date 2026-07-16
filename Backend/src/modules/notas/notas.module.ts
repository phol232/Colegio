import { Module } from '@nestjs/common';
import { NotasController } from './notas.controller';
import { NotasService } from './application/notas.service';

@Module({
  controllers: [NotasController],
  providers: [NotasService],
  exports: [NotasService],
})
export class NotasModule {}
