/** Datos para reservar un alojamiento. El Huésped es siempre el del token, no un dato del cuerpo. */
export interface SolicitudReserva {
  idPublicacion: number;
  /** Formato `AAAA-MM-DD`; no puede ser anterior a hoy. */
  fechaLlegada: string;
  /** Formato `AAAA-MM-DD`; esa noche no se ocupa. */
  fechaSalida: string;
  /** No puede superar la capacidad del alojamiento. */
  huespedes: number;
}

/** Desglose del precio al crear la reserva, tal como lo calcula el backend (en pesos). */
export interface PrecioReserva {
  precioBase: number;
  porcentajeDescuento: number;
  valorDescuento: number;
  tarifaLimpieza: number;
  porcentajeTarifaServicio: number;
  tarifaServicio: number;
  total: number;
}

export interface Reserva {
  idReserva: number;
  idPublicacion: number;
  fechaLlegada: string;
  fechaSalida: string;
  noches: number;
  huespedes: number;
  /** `PENDIENTE_PAGO` al crearla: ocupa las fechas hasta `fechaExpiracion` mientras se paga. */
  estado: string;
  /** Hasta cuándo espera el pago; después vence y libera las fechas (UTC, ISO 8601). */
  fechaExpiracion: string;
  precio: PrecioReserva;
}
