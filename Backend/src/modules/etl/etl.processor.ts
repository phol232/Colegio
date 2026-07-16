import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EtlMode, EtlService } from './etl.service';

export const OLAP_SYNC_QUEUE = 'olap-sync';

export interface OlapSyncJobData {
  mode: EtlMode;
}

@Processor(OLAP_SYNC_QUEUE)
export class EtlProcessor extends WorkerHost {
  private readonly logger = new Logger(EtlProcessor.name);

  constructor(private readonly etlService: EtlService) {
    super();
  }

  async process(job: Job<OlapSyncJobData>) {
    const mode = job.data?.mode ?? 'incremental';
    this.logger.log(`Procesando job ${job.id} mode=${mode}`);
    const result = await this.etlService.run(mode);
    this.logger.log(
      `Job ${job.id} finalizado: ${result.registros} registros`,
    );
    return result;
  }
}
