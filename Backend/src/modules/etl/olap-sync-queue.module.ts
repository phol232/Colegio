import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OLAP_SYNC_QUEUE } from './etl.processor';
import { RendimientoSyncListener } from './rendimiento-sync.listener';

/**
 * Registers the olap-sync queue + event listener for the HTTP API process.
 * The worker process uses EtlModule + EtlProcessor instead.
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: OLAP_SYNC_QUEUE,
    }),
  ],
  providers: [RendimientoSyncListener],
  exports: [BullModule],
})
export class OlapSyncQueueModule {}
