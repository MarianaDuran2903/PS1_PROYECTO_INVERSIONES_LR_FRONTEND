import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EventTrackerService } from '@core/tracking/event-tracker.service';
import { SolicitudRecuperacionInvalidaError } from '../domain/errors/recuperacion.errors';
import { AuthRepository } from '../domain/repositories/auth.repository';

export const EVENTO_RECUPERACION_SOLICITADA = 'RECUPERACION_SOLICITADA';

export const MENSAJE_SOLICITUD_NEUTRAL =
  'Si el correo está registrado, recibirás las instrucciones para restablecer tu contraseña';
export const MENSAJE_SOLICITUD_FALLIDA =
  'No pudimos procesar tu solicitud. Inténtalo de nuevo en unos minutos.';

export type EstadoSolicitudRecuperacion = 'inactivo' | 'enviando' | 'enviado' | 'error';

interface SolicitudState {
  estado: EstadoSolicitudRecuperacion;
  /** Confirmación neutral del backend: es la misma exista o no el correo. */
  confirmacion: string | null;
  mensajeError: string | null;
  errorCorreo: string | null;
}

const ESTADO_INICIAL: SolicitudState = {
  estado: 'inactivo',
  confirmacion: null,
  mensajeError: null,
  errorCorreo: null,
};

/**
 * Facade / caso de uso "Solicitar recuperación de contraseña" (RF-USR-004). Nunca guarda ni
 * registra el correo: la traza del cliente va sin datos y el mensaje no distingue si existe.
 */
@Injectable()
export class RecuperarContrasenaFacade {
  private readonly repository = inject(AuthRepository);
  private readonly tracker = inject(EventTrackerService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<SolicitudState>(ESTADO_INICIAL);

  readonly estado = computed(() => this.state().estado);
  readonly enviando = computed(() => this.state().estado === 'enviando');
  readonly confirmacion = computed(() => this.state().confirmacion);
  readonly mensajeError = computed(() => this.state().mensajeError);
  readonly errorCorreo = computed(() => this.state().errorCorreo);

  solicitar(correo: string): void {
    if (this.enviando()) {
      return;
    }
    this.state.set({ ...ESTADO_INICIAL, estado: 'enviando' });

    this.repository
      .solicitarRecuperacion(correo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (mensaje) => {
          this.state.set({
            ...ESTADO_INICIAL,
            estado: 'enviado',
            confirmacion: mensaje || MENSAJE_SOLICITUD_NEUTRAL,
          });
          this.tracker.track(EVENTO_RECUPERACION_SOLICITADA);
        },
        error: (error: unknown) => this.state.set({ ...ESTADO_INICIAL, ...this.describir(error) }),
      });
  }

  private describir(error: unknown): Omit<SolicitudState, 'confirmacion'> {
    if (error instanceof SolicitudRecuperacionInvalidaError) {
      return {
        estado: 'error',
        mensajeError: null,
        errorCorreo: error.errores.correo ?? error.message,
      };
    }
    // Red o 5xx: mensaje fijo, sin detalles técnicos.
    return { estado: 'error', mensajeError: MENSAJE_SOLICITUD_FALLIDA, errorCorreo: null };
  }
}
