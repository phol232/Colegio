import { Module } from '@nestjs/common';
import { PromediosController } from './promedios.controller';
import { PromediosService } from './application/promedios.service';

@Module({
  controllers: [PromediosController],
  providers: [PromediosService],
  exports: [PromediosService],
})
export class PromediosModule {}
