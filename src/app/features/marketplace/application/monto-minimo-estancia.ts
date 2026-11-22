import { MONTO_MINIMO_PAGO_COP } from '@shared/pagos/monto-minimo-pago';
import { Cotizacion } from '../domain/models/cotizacion';

/** El total cotizado no alcanza el mínimo que acepta la pasarela de pagos: no se puede pagar. */
export function estanciaBajoMinimoDePago(cotizacion: Cotizacion): boolean {
  return cotizacion.precio.total < MONTO_MINIMO_PAGO_COP;
}

/**
 * Cuántas noches habría que reservar, como mínimo, para que el total alcance el mínimo de pago.
 * Es una estimación a partir del desglose del backend: separa lo que crece con cada noche (el
 * precio por noche, menos el descuento, y los servicios por noche) de lo que se cobra una sola vez
 * (limpieza y servicios por estancia), y aplica la tarifa de servicio en la misma proporción que
 * la cotización. El backend recalcula al volver a cotizar, así que el total final es el suyo.
 *
 * Devuelve `null` si el total ya alcanza el mínimo o si no hay nada que crezca por noche.
 */
export function nochesMinimasParaPagar(cotizacion: Cotizacion): number | null {
  const { noches, precio } = cotizacion;
  if (!estanciaBajoMinimoDePago(cotizacion) || noches <= 0) {
    return null;
  }

  const serviciosPorNoche = precio.serviciosAdicionales
    .filter((servicio) => servicio.tipoCobro === 'POR_NOCHE')
    .reduce((suma, servicio) => suma + servicio.precio, 0);
  const serviciosPorEstancia = precio.serviciosAdicionales
    .filter((servicio) => servicio.tipoCobro === 'POR_ESTANCIA')
    .reduce((suma, servicio) => suma + servicio.valor, 0);

  const porNoche = (precio.precioBase - precio.valorDescuento) / noches + serviciosPorNoche;
  if (porNoche <= 0) {
    return null;
  }

  const subtotal = precio.total - precio.tarifaServicio;
  const factorServicio = subtotal > 0 ? precio.total / subtotal : 1;
  const fijo = precio.tarifaLimpieza + serviciosPorEstancia;

  // Se resta una milésima para que un resultado exacto (p. ej. 3,0000001 por redondeo) no suba
  // una noche de más.
  const necesarias = Math.ceil((MONTO_MINIMO_PAGO_COP / factorServicio - fijo) / porNoche - 1e-3);

  return Math.max(noches + 1, necesarias);
}
