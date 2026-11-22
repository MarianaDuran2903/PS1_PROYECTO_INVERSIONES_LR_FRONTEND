/**
 * Monto mínimo, en pesos colombianos, que el sistema admite cobrar por una reserva.
 *
 * La pasarela de pagos (Stripe) rechaza cualquier cobro que no equivalga al menos a 0,50 de la
 * moneda de la cuenta (euros) con `amount_too_small`. Según el tipo de cambio eso ronda los
 * 1.900 COP, así que se fija un mínimo propio, con margen y fácil de explicar: $ 10.000.
 *
 * Se aplica en dos lugares: el precio por noche de una publicación no puede ser menor, y el total
 * de una estancia tampoco (si lo es, el Huésped debe reservar más noches).
 */
export const MONTO_MINIMO_PAGO_COP = 10_000;

/** El mínimo ya formateado para los mensajes: "$ 10.000". */
export const MONTO_MINIMO_PAGO_TEXTO = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(MONTO_MINIMO_PAGO_COP);
