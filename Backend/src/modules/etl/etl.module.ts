import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EtlService } from './etl.service';
import { OLAP_SYNC_QUEUE } from './etl.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: OLAP_SYNC_QUEUE,
    }),
  ],
  providers: [EtlService],
  exports: [EtlService, BullModule],
})
export class EtlModule {}
