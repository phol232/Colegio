import { Module } from '@nestjs/common';
import { PadresController } from './padres.controller';
import { PadresService } from './padres.service';

@Module({
  controllers: [PadresController],
  providers: [PadresService],
  exports: [PadresService],
})
export class PadresModule {}
