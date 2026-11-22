import { Observable } from 'rxjs';
import { Cotizacion, SolicitudCotizacion } from '../models/cotizacion';

/**
 * Puerto de la cotización de una estancia. Los fallos llegan como errores de dominio
 * (`CotizacionInvalidaError`, `AlojamientoNoCotizableError`, `FechasNoDisponiblesError` y
 * `SinPermisoParaCotizarError`); cualquier otro se propaga tal cual.
 */
export abstract class CotizacionRepository {
  abstract cotizar(solicitud: SolicitudCotizacion): Observable<Cotizacion>;
}
