import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OLAP_SYNC_QUEUE } from './etl.processor';
import {
  RENDIMIENTO_CURSO_CAMBIADO,
  RendimientoCursoCambiadoPayload,
} from './rendimiento.events';

const COURSE_SYNC_DELAY_MS = 20_000;

@Injectable()
export class RendimientoSyncListener {
  private readonly logger = new Logger(RendimientoSyncListener.name);

  constructor(
    @InjectQueue(OLAP_SYNC_QUEUE) private readonly olapQueue: Queue,
  ) {}

  @OnEvent(RENDIMIENTO_CURSO_CAMBIADO)
  async handleCursoCambiado(payload: RendimientoCursoCambiadoPayload) {
    const cursoId = Number(payload?.cursoId);
    if (!Number.isFinite(cursoId) || cursoId <= 0) {
      return;
    }

    const jobId = `fact:curso:${cursoId}`;
    try {
      await this.olapQueue.add(
        'curso',
        { mode: 'curso' as const, cursoId },
        {
          jobId,
          delay: COURSE_SYNC_DELAY_MS,
          removeOnComplete: 50,
          removeOnFail: 20,
          attempts: 2,
          backoff: { type: 'exponential', delay: 30_000 },
        },
      );
      this.logger.debug(
        `Encolado sync curso=${cursoId} (debounce ${COURSE_SYNC_DELAY_MS}ms)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists|duplicat/i.test(message)) {
        this.logger.debug(
          `Sync curso=${cursoId} ya encolado (jobId=${jobId}), se omite`,
        );
        return;
      }
      this.logger.warn(
        `No se pudo encolar sync curso=${cursoId}: ${message}`,
      );
    }
  }
}
