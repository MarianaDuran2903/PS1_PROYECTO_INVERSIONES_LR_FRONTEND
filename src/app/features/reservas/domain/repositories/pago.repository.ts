import { Observable } from 'rxjs';
import { Pago } from '../models/pago';

/**
 * Puerto del pago de una reserva. Los fallos del backend llegan como errores de dominio
 * (`ReservaNoEncontradaError`, `PagoNoIniciadoError`, `SinPermisoSobreReservaError`,
 * `ReservaYaPagadaError`, `ReservaNoAdmitePagoError`, `IntentosDePagoAgotadosError` y
 * `PasarelaDePagoNoDisponibleError`); cualquier otro se propaga tal cual.
 */
export abstract class PagoRepository {
  /** Abre una sesión de pago (o devuelve la que ya estaba abierta). No lleva cuerpo ni monto. */
  abstract iniciar(idReserva: number): Observable<Pago>;

  /** Consulta el estado actual del pago. Es la única fuente de verdad: no se guarda en el front. */
  abstract consultar(idReserva: number): Observable<Pago>;
}
