import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { LoggerService } from '@core/logging/logger.service';

export interface TrackedEvent {
  id: string;
  name: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

/**
 * Registro de eventos de negocio del lado cliente para trazabilidad.
 *
 * Importante: el registro de auditoría oficial (p. ej. "cuenta creada") lo debe
 * persistir el backend en la misma transacción que crea el recurso. Este servicio
 * complementa esa traza con el contexto del cliente y nunca bloquea la UI.
 * No enviar datos personales (correo, teléfono, contraseña) en el payload.
 */
@Injectable({ providedIn: 'root' })
export class EventTrackerService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);
  private readonly logger = inject(LoggerService);

  track(name: string, payload: Record<string, unknown> = {}): TrackedEvent | null {
    if (!this.config.tracking.enabled) {
      return null;
    }

    const event: TrackedEvent = {
      id: crypto.randomUUID(),
      name,
      occurredAt: new Date().toISOString(),
      payload,
    };
    this.logger.info(`Evento registrado: ${name}`, event);

    if (this.config.tracking.remote) {
      this.http.post<void>(`${this.config.apiUrl}/events`, event).subscribe({
        error: () => this.logger.warn(`No se pudo enviar el evento ${name} al servidor`),
      });
    }
    return event;
  }
}
