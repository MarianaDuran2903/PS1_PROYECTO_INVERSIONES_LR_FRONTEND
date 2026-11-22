import {
  IntentosDePagoAgotadosError,
  PagoNoIniciadoError,
  PasarelaDePagoNoDisponibleError,
  ReservaNoAdmitePagoError,
  ReservaNoEncontradaError,
  ReservaYaPagadaError,
  SinPermisoSobreReservaError,
} from '../domain/errors/pago.errors';

/** Qué le pasó al pago, para que la pantalla elija qué explicar y qué ofrecer. */
export type TipoErrorPago =
  /** La reserva ya está pagada y confirmada. */
  | 'ya-pagada'
  /** La reserva venció o ya no admite pago: hay que crear una nueva. */
  | 'no-admite-pago'
  /** Se usaron las 3 sesiones de pago: hay que crear una nueva reserva. */
  | 'intentos-agotados'
  /** La pasarela no respondió: se puede reintentar en unos minutos. */
  | 'pasarela'
  | 'no-encontrada'
  /** La reserva existe, pero todavía no tiene un pago iniciado (solo al consultar). */
  | 'sin-pago'
  | 'sin-permiso'
  | 'otro';

export interface ErrorPago {
  tipo: TipoErrorPago;
  mensaje: string;
}

export const MENSAJE_PASARELA = 'No pudimos iniciar el pago, intenta de nuevo en unos minutos.';
export const MENSAJE_RESERVA_INEXISTENTE = 'La reserva no existe';
export const MENSAJE_SIN_PAGINA_DE_PAGO = 'No pudimos abrir la página de pago. Inténtalo de nuevo.';
const MENSAJE_GENERICO = 'No fue posible completar la operación. Inténtalo de nuevo.';

/** Traduce el error que llega del repositorio a lo que la pantalla necesita saber. */
export function clasificarErrorPago(error: unknown): ErrorPago {
  if (error instanceof ReservaYaPagadaError) {
    return { tipo: 'ya-pagada', mensaje: error.message };
  }
  if (error instanceof ReservaNoAdmitePagoError) {
    return { tipo: 'no-admite-pago', mensaje: error.message };
  }
  if (error instanceof IntentosDePagoAgotadosError) {
    return { tipo: 'intentos-agotados', mensaje: error.message };
  }
  if (error instanceof PasarelaDePagoNoDisponibleError) {
    return { tipo: 'pasarela', mensaje: MENSAJE_PASARELA };
  }
  if (error instanceof ReservaNoEncontradaError) {
    return { tipo: 'no-encontrada', mensaje: error.message };
  }
  if (error instanceof PagoNoIniciadoError) {
    return { tipo: 'sin-pago', mensaje: error.message };
  }
  if (error instanceof SinPermisoSobreReservaError) {
    return { tipo: 'sin-permiso', mensaje: error.message };
  }
  return {
    tipo: 'otro',
    mensaje: error instanceof Error && error.message ? error.message : MENSAJE_GENERICO,
  };
}
