/** Cómo se cobra un servicio adicional: por cada noche o una sola vez por la estancia. */
export type TipoCobroServicio = 'POR_NOCHE' | 'POR_ESTANCIA';

/** Datos que se envían para cotizar. La cotización no reserva ni bloquea las fechas. */
export interface SolicitudCotizacion {
  idPublicacion: number;
  /** Formato `AAAA-MM-DD`. */
  fechaLlegada: string;
  /** Formato `AAAA-MM-DD`; la noche de la salida no se cobra. */
  fechaSalida: string;
  /** Opcional. No cambia el precio, pero el backend valida que quepa en el alojamiento. */
  huespedes?: number;
  /** Opcional: nombres exactos de servicios del alojamiento. Omitir si no se conocen. */
  serviciosAdicionales?: readonly string[];
}

export interface ServicioCotizado {
  nombre: string;
  tipoCobro: TipoCobroServicio;
  /** Precio unitario. */
  precio: number;
  /** Lo que se cobra: `precio × noches` o `precio` según el tipo de cobro (0 si es gratuito). */
  valor: number;
}

/** Desglose tal como lo calcula el backend; el front solo lo muestra, sin recalcular nada. */
export interface DesglosePrecio {
  precioNoche: number;
  precioBase: number;
  /** 0 salvo en estadías largas. */
  porcentajeDescuento: number;
  valorDescuento: number;
  tarifaLimpieza: number;
  serviciosAdicionales: ServicioCotizado[];
  totalServiciosAdicionales: number;
  porcentajeTarifaServicio: number;
  tarifaServicio: number;
  total: number;
}

export interface Cotizacion {
  idPublicacion: number;
  fechaLlegada: string;
  fechaSalida: string;
  noches: number;
  precio: DesglosePrecio;
}
