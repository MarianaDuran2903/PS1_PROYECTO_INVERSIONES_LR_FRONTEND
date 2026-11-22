import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AlojamientoNoCotizableError,
  CotizacionInvalidaError,
  ErroresCotizacion,
  FechasNoDisponiblesError,
  SinPermisoParaCotizarError,
} from '../domain/errors/cotizacion.errors';
import { Cotizacion, SolicitudCotizacion } from '../domain/models/cotizacion';
import { CotizacionRepository } from '../domain/repositories/cotizacion.repository';
import { Subscription } from 'rxjs';

export type EstadoCotizacion =
  /** Todavía no se ha pedido ninguna cotización, o los datos dejaron de ser válidos. */
  | 'inactiva'
  | 'cotizando'
  | 'lista'
  /** 409: alguna noche del rango no está disponible. */
  | 'fechas-no-disponibles'
  /** 404: el alojamiento ya no se puede cotizar. */
  | 'alojamiento-no-disponible'
  /** 403: el usuario no es Huésped. */
  | 'sin-permiso'
  /** 400: el servidor rechazó algún campo; ver `errores`. */
  | 'invalida'
  | 'error';

interface CotizacionState {
  estado: EstadoCotizacion;
  cotizacion: Cotizacion | null;
  /** Lo que se pidió cotizar, solo mientras la cotización está lista: es lo que se puede reservar. */
  solicitud: SolicitudCotizacion | null;
  mensaje: string | null;
  errores: ErroresCotizacion;
}

const INICIAL: CotizacionState = {
  estado: 'inactiva',
  cotizacion: null,
  solicitud: null,
  mensaje: null,
  errores: {},
};

/**
 * Cotiza una estancia. La primera cotización la pide la persona (`cotizar`); desde ahí, cada vez
 * que cambian las fechas o los huéspedes se vuelve a cotizar (`alCambiar`). Una respuesta
 * atrasada nunca pisa a una más reciente: al pedir otra cotización se cancela la anterior.
 *
 * Mientras se espera una respuesta no se conserva el desglose anterior, para no mostrar un
 * total que ya no corresponde a lo que la persona eligió. No reserva ni bloquea las fechas.
 */
@Injectable()
export class CotizacionFacade {
  private readonly repository = inject(CotizacionRepository);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<CotizacionState>(INICIAL);
  private peticion?: Subscription;
  /** Ya se pidió una cotización: los cambios siguientes la actualizan sin pedirla de nuevo. */
  private activa = false;

  readonly estado = computed(() => this.state().estado);
  readonly cotizacion = computed(() => this.state().cotizacion);
  readonly mensaje = computed(() => this.state().mensaje);
  /** Mensajes del servidor por campo (solo con el estado `invalida`). */
  readonly errores = computed(() => this.state().errores);
  readonly cotizando = computed(() => this.state().estado === 'cotizando');
  /** Lo que muestra la cotización lista: exactamente lo que se reservaría. */
  readonly solicitudCotizada = computed(() => this.state().solicitud);

  /** La persona pidió cotizar. */
  cotizar(solicitud: SolicitudCotizacion): void {
    this.activa = true;
    this.ejecutar(solicitud);
  }

  /**
   * Cambiaron los datos de la estancia. Con `null` los datos no son válidos: se descarta lo que
   * se mostraba. Si nunca se pidió una cotización, no hace nada.
   */
  alCambiar(solicitud: SolicitudCotizacion | null): void {
    if (!this.activa) {
      return;
    }
    if (solicitud === null) {
      this.peticion?.unsubscribe();
      this.state.set(INICIAL);
      return;
    }
    this.ejecutar(solicitud);
  }

  /** Vuelve al comienzo (por ejemplo, al cambiar de alojamiento). */
  reiniciar(): void {
    this.peticion?.unsubscribe();
    this.activa = false;
    this.state.set(INICIAL);
  }

  private ejecutar(solicitud: SolicitudCotizacion): void {
    this.peticion?.unsubscribe();
    this.state.set({ ...INICIAL, estado: 'cotizando' });

    this.peticion = this.repository
      .cotizar(solicitud)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cotizacion) =>
          this.state.set({ ...INICIAL, estado: 'lista', cotizacion, solicitud }),
        error: (error: unknown) => this.state.set(this.estadoDeError(error)),
      });
  }

  private estadoDeError(error: unknown): CotizacionState {
    if (error instanceof CotizacionInvalidaError) {
      return { ...INICIAL, estado: 'invalida', mensaje: error.message, errores: error.errores };
    }
    if (error instanceof FechasNoDisponiblesError) {
      return { ...INICIAL, estado: 'fechas-no-disponibles', mensaje: error.message };
    }
    if (error instanceof AlojamientoNoCotizableError) {
      return { ...INICIAL, estado: 'alojamiento-no-disponible', mensaje: error.message };
    }
    if (error instanceof SinPermisoParaCotizarError) {
      return { ...INICIAL, estado: 'sin-permiso', mensaje: error.message };
    }
    const mensaje =
      error instanceof Error && error.message
        ? error.message
        : 'No fue posible cotizar la estancia. Inténtalo de nuevo.';
    return { ...INICIAL, estado: 'error', mensaje };
  }
}
