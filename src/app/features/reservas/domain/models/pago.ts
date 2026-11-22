/**
 * Estado del pago de una reserva. Solo este valor dice si el pago se aprobó: volver de la página
 * de pago NO significa que haya sido aprobado.
 */
export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'EXPIRADO';

/** Pago de una reserva, tal como lo devuelve el backend. */
export interface Pago {
  idPago: number;
  idReserva: number;
  estado: EstadoPago;
  /** `PENDIENTE_PAGO` mientras no se aprueba; `CONFIRMADA` cuando el pago se aprueba. */
  estadoReserva: string;
  /** Total de la reserva en pesos. El backend siempre cobra el total: el front no envía montos. */
  monto: number;
  moneda: string;
  /**
   * Página de pago donde se redirige a la persona. Solo viene mientras la sesión admite el pago
   * (`PENDIENTE` o `RECHAZADO` sin vencer); en `APROBADO` y `EXPIRADO` es `null`.
   */
  urlPago: string | null;
  /** Hasta cuándo admite el pago la página de pago (UTC, ISO 8601). */
  fechaExpiracion: string;
  /** Código técnico del rechazo (por ejemplo `card_declined`); no se muestra a la persona. */
  codigoRechazo: string | null;
  /** Motivo del rechazo, ya en español; es el que se muestra tal cual. */
  motivoRechazo: string | null;
}
