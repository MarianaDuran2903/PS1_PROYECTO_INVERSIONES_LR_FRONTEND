import { ApiError } from '@core/http/api-error';
import {
  AlojamientoNoReservableError,
  ErroresReserva,
  FechasNoDisponiblesParaReservarError,
  ReservaInvalidaError,
  SinPermisoParaReservarError,
} from '../domain/errors/reserva.errors';

/** Qué le pasó a la reserva, para que la pantalla elija qué explicar y qué ofrecer. */
export type TipoErrorReserva =
  /** Otra persona tomó alguna de las noches (409). */
  | 'fechas-no-disponibles'
  /** El alojamiento ya no se puede reservar (404). */
  | 'alojamiento-no-disponible'
  | 'sin-permiso'
  /** El servidor rechazó algún dato (400); ver `errores`. */
  | 'invalida'
  | 'otro';

export interface ErrorReserva {
  tipo: TipoErrorReserva;
  mensaje: string;
  /** Mensajes por campo, solo con el tipo `invalida`. */
  errores: ErroresReserva;
}

const MENSAJE_GENERICO = 'No fue posible crear la reserva. Inténtalo de nuevo.';

/** Traduce el error que llega del repositorio a lo que la pantalla necesita saber. */
export function clasificarErrorReserva(error: unknown): ErrorReserva {
  if (error instanceof FechasNoDisponiblesParaReservarError) {
    return { tipo: 'fechas-no-disponibles', mensaje: error.message, errores: {} };
  }
  if (error instanceof AlojamientoNoReservableError) {
    return { tipo: 'alojamiento-no-disponible', mensaje: error.message, errores: {} };
  }
  if (error instanceof SinPermisoParaReservarError) {
    return { tipo: 'sin-permiso', mensaje: error.message, errores: {} };
  }
  if (error instanceof ReservaInvalidaError) {
    return { tipo: 'invalida', mensaje: error.message, errores: error.errores };
  }
  return {
    tipo: 'otro',
    mensaje: error instanceof Error && error.message ? error.message : MENSAJE_GENERICO,
    errores: {},
  };
}

/**
 * Un corte de red o un fallo del servidor no dicen si la reserva se llegó a crear: al reintentar
 * se conserva la misma clave de idempotencia para que el backend no cree una segunda. Cualquier
 * otra respuesta es definitiva y el siguiente intento usa una clave nueva.
 */
export function esFalloIncierto(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}
