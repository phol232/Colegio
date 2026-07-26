import { Injectable } from '@nestjs/common';

type NotifyFn = (cursoId?: number, docenteId?: number) => Promise<void>;

/**
 * Puente entre infraestructura (TypeORM repos en AppTypeOrmModule) y el
 * canal WebSocket (AnalisisModule). Evita dependencia circular de módulos:
 * CommonModule/AppTypeOrmModule se carga antes que AnalisisModule.
 *
 * Sin handler registrado (p. ej. scheduler) notificarCambio es no-op.
 */
@Injectable()
export class AnalisisRealtimeBridge {
  private handler: NotifyFn | null = null;

  register(handler: NotifyFn): void {
    this.handler = handler;
  }

  async notificarCambio(cursoId?: number, docenteId?: number): Promise<void> {
    if (!this.handler) return;
    await this.handler(cursoId, docenteId);
  }
}
