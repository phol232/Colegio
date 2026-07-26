import { Global, Module } from '@nestjs/common';
import { AnalisisController } from './analisis.controller';
import { AnalisisService } from './analisis.service';
import { AnalisisGateway } from './analisis.gateway';
import { AnalisisRealtimeService } from './analisis-realtime.service';

@Global()
@Module({
  controllers: [AnalisisController],
  providers: [AnalisisService, AnalisisGateway, AnalisisRealtimeService],
  exports: [AnalisisService, AnalisisRealtimeService, AnalisisGateway],
})
export class AnalisisModule {}
