import { Module } from '@nestjs/common';
import { AnalisisController } from './analisis.controller';
import { AnalisisService } from './analisis.service';

@Module({
  controllers: [AnalisisController],
  providers: [AnalisisService],
  exports: [AnalisisService],
})
export class AnalisisModule {}
