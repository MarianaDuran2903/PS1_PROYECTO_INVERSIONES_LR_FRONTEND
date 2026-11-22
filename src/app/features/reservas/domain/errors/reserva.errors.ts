/** Campos de la solicitud que el backend puede rechazar en un 400. */
export type ErroresReserva = Partial<
  Record<'idPublicacion' | 'fechaLlegada' | 'fechaSalida' | 'huespedes', string>
>;

/** El servidor rechazó uno o más datos de la reserva (400 con `errores`). */
export class ReservaInvalidaError extends Error {
  constructor(
    readonly errores: ErroresReserva,
    message = 'Revisa las fechas y los huéspedes e inténtalo de nuevo.',
  ) {
    super(message);
    this.name = 'ReservaInvalidaError';
  }
}

/** Alguna noche del rango ya no está disponible (409): otra persona la tomó. */
export class FechasNoDisponiblesParaReservarError extends Error {
  constructor(message = 'Las fechas seleccionadas no están disponibles') {
    super(message);
    this.name = 'FechasNoDisponiblesParaReservarError';
  }
}

/** El alojamiento no existe o ya no está disponible (404). */
export class AlojamientoNoReservableError extends Error {
  constructor(message = 'El alojamiento no está disponible') {
    super(message);
    this.name = 'AlojamientoNoReservableError';
  }
}

/** Solo el rol Huésped puede reservar (403). */
export class SinPermisoParaReservarError extends Error {
  constructor(message = 'Solo los Huéspedes pueden reservar un alojamiento') {
    super(message);
    this.name = 'SinPermisoParaReservarError';
  }
}
