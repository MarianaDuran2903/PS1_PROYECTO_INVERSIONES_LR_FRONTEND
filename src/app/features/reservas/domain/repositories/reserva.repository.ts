import { Observable } from 'rxjs';
import { Reserva, SolicitudReserva } from '../models/reserva';

/**
 * Puerto de la creación de reservas. Los fallos del backend llegan como errores de dominio
 * (`ReservaInvalidaError`, `FechasNoDisponiblesParaReservarError`, `AlojamientoNoReservableError`
 * y `SinPermisoParaReservarError`); cualquier otro se propaga tal cual.
 */
export abstract class ReservaRepository {
  /**
   * Crea una reserva `PENDIENTE_PAGO` y ocupa las fechas hasta que venza el plazo de pago.
   * `claveIdempotencia` identifica el intento: si se reenvía la misma con la misma solicitud, el
   * backend devuelve la reserva ya creada en lugar de crear otra.
   */
  abstract crear(solicitud: SolicitudReserva, claveIdempotencia: string): Observable<Reserva>;
}
