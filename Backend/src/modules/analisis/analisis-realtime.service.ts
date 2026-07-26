import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CacheService } from '@/common/redis/cache.service';
import { AnalisisRealtimeBridge } from '@/common/analisis/analisis-realtime.bridge';
import { AnalisisGateway } from './analisis.gateway';

const COALESCE_MS = 300;

interface PendingNotify {
  cursoId?: number;
  docenteId?: number;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Notifica cambios de análisis: bump de versión Redis + emit WebSocket.
 * Nunca lanza: una caída del canal no debe tumbar el guardado de notas.
 * Se registra en AnalisisRealtimeBridge para que los repos TypeORM
 * (AppTypeOrmModule) puedan notificar sin depender de este módulo.
 */
@Injectable()
export class AnalisisRealtimeService implements OnModuleInit {
  private readonly logger = new Logger(AnalisisRealtimeService.name);
  private readonly pending = new Map<string, PendingNotify>();

  constructor(
    private readonly cache: CacheService,
    private readonly gateway: AnalisisGateway,
    private readonly bridge: AnalisisRealtimeBridge,
  ) {}

  onModuleInit() {
    this.bridge.register((cursoId, docenteId) =>
      this.notificarCambio(cursoId, docenteId),
    );
  }

  async notificarCambio(cursoId?: number, docenteId?: number): Promise<void> {
    try {
      const key =
        cursoId != null ? `curso:${cursoId}` : `global:${docenteId ?? 'all'}`;

      const existing = this.pending.get(key);
      if (existing) {
        clearTimeout(existing.timer);
        existing.docenteId = docenteId ?? existing.docenteId;
        existing.timer = setTimeout(() => {
          void this.flush(key);
        }, COALESCE_MS);
        return;
      }

      const entry: PendingNotify = {
        cursoId,
        docenteId,
        timer: setTimeout(() => {
          void this.flush(key);
        }, COALESCE_MS),
      };
      this.pending.set(key, entry);
    } catch (error) {
      this.logger.warn(
        `notificarCambio falló: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async flush(key: string): Promise<void> {
    const entry = this.pending.get(key);
    this.pending.delete(key);
    if (!entry) return;

    try {
      const version = await this.cache.bumpAnalisisVersion();
      this.gateway.emitirCambio({
        version,
        cursoId: entry.cursoId,
        docenteId: entry.docenteId,
      });
    } catch (error) {
      this.logger.warn(
        `flush analisis falló: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
