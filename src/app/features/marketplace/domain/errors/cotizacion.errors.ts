/** Campos de la solicitud que el backend puede rechazar en un 400. */
export type ErroresCotizacion = Partial<
  Record<
    'idPublicacion' | 'fechaLlegada' | 'fechaSalida' | 'huespedes' | 'serviciosAdicionales',
    string
  >
>;

/** El servidor rechazó uno o más datos de la solicitud (400 con `errores`). */
export class CotizacionInvalidaError extends Error {
  constructor(
    readonly errores: ErroresCotizacion,
    message = 'Revisa las fechas y los huéspedes e inténtalo de nuevo.',
  ) {
    super(message);
    this.name = 'CotizacionInvalidaError';
  }
}

/** El alojamiento no existe, está pausado, bloqueado o sin publicar (404). */
export class AlojamientoNoCotizableError extends Error {
  constructor(message = 'El alojamiento no está disponible') {
    super(message);
    this.name = 'AlojamientoNoCotizableError';
  }
}

/** Alguna noche del rango no está disponible (409). No hay desglose que mostrar. */
export class FechasNoDisponiblesError extends Error {
  constructor(message = 'No se puede generar una cotización para las fechas seleccionadas') {
    super(message);
    this.name = 'FechasNoDisponiblesError';
  }
}

/** Solo el rol Huésped puede cotizar (403). */
export class SinPermisoParaCotizarError extends Error {
  constructor(message = 'Solo los Huéspedes pueden cotizar una estancia') {
    super(message);
    this.name = 'SinPermisoParaCotizarError';
  }
}
