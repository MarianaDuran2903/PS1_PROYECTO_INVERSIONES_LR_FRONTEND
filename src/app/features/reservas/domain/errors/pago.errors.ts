/** La reserva no existe (404). */
export class ReservaNoEncontradaError extends Error {
  constructor(message = 'La reserva no existe') {
    super(message);
    this.name = 'ReservaNoEncontradaError';
  }
}

/** La reserva todavía no tiene un pago iniciado (404 al consultar el pago). */
export class PagoNoIniciadoError extends Error {
  constructor(message = 'La reserva no tiene un pago iniciado') {
    super(message);
    this.name = 'PagoNoIniciadoError';
  }
}

/** La reserva es de otro Huésped, o la persona no es Huésped (403). */
export class SinPermisoSobreReservaError extends Error {
  constructor(message = 'No tiene permisos sobre esta reserva') {
    super(message);
    this.name = 'SinPermisoSobreReservaError';
  }
}

/** La reserva ya está pagada y confirmada (409). */
export class ReservaYaPagadaError extends Error {
  constructor(message = 'La reserva ya está pagada y confirmada') {
    super(message);
    this.name = 'ReservaYaPagadaError';
  }
}

/** La reserva venció o ya no admite pago (409): hay que crear una nueva. */
export class ReservaNoAdmitePagoError extends Error {
  constructor(message = 'La reserva venció o ya no admite pago; cree una nueva reserva') {
    super(message);
    this.name = 'ReservaNoAdmitePagoError';
  }
}

/** Se usaron las 3 sesiones de pago que admite una reserva (409). */
export class IntentosDePagoAgotadosError extends Error {
  constructor(message = 'Se agotaron los intentos de pago de esta reserva') {
    super(message);
    this.name = 'IntentosDePagoAgotadosError';
  }
}

/**
 * El total de la reserva es menor al mínimo que acepta la pasarela de pagos (422). Reintentar no
 * sirve, porque el monto no cambia: hay que reservar más noches.
 */
export class MontoBajoMinimoDePagoError extends Error {
  constructor(
    message = 'El monto de la reserva es menor al mínimo que acepta la pasarela de pagos',
  ) {
    super(message);
    this.name = 'MontoBajoMinimoDePagoError';
  }
}

/** No se pudo comunicar con la pasarela de pagos (502). Reintentar en unos minutos. */
export class PasarelaDePagoNoDisponibleError extends Error {
  constructor(message = 'No se pudo comunicar con la pasarela de pagos') {
    super(message);
    this.name = 'PasarelaDePagoNoDisponibleError';
  }
}
