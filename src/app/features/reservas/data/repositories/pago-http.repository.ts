import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { OMITIR_AVISO_403 } from '@core/http/http-contexts';
import { catchError, map, Observable, throwError } from 'rxjs';
import {
  IntentosDePagoAgotadosError,
  MontoBajoMinimoDePagoError,
  PagoNoIniciadoError,
  PasarelaDePagoNoDisponibleError,
  ReservaNoAdmitePagoError,
  ReservaNoEncontradaError,
  ReservaYaPagadaError,
  SinPermisoSobreReservaError,
} from '../../domain/errors/pago.errors';
import { EstadoPago, Pago } from '../../domain/models/pago';
import { PagoRepository } from '../../domain/repositories/pago.repository';

interface PagoDto {
  idPago: number;
  idReserva: number;
  estado: EstadoPago;
  estadoReserva: string;
  monto: number;
  moneda: string;
  urlPago?: string | null;
  fechaExpiracion: string;
  codigoRechazo?: string | null;
  motivoRechazo?: string | null;
}

/**
 * `POST` y `GET /reservas/{idReserva}/pago` (solo rol HUESPED). El front nunca ve datos de
 * tarjeta ni necesita claves de la pasarela: solo recibe la URL a la que redirigir.
 */
@Injectable()
export class PagoHttpRepository extends PagoRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_CONFIG).apiUrl;

  override iniciar(idReserva: number): Observable<Pago> {
    return this.http
      .post<PagoDto>(this.url(idReserva), null, this.opciones())
      .pipe(this.aDominio());
  }

  override consultar(idReserva: number): Observable<Pago> {
    return this.http.get<PagoDto>(this.url(idReserva), this.opciones()).pipe(this.aDominio());
  }

  private url(idReserva: number): string {
    return `${this.apiUrl}/reservas/${idReserva}/pago`;
  }

  /** El 403 lo explica la propia pantalla: no se muestra además el aviso global de permisos. */
  private opciones() {
    return { context: new HttpContext().set(OMITIR_AVISO_403, true) };
  }

  /** Mapea la respuesta (200 o 201, se tratan igual) y traduce los errores a errores de dominio. */
  private aDominio() {
    return (origen: Observable<PagoDto>): Observable<Pago> =>
      origen.pipe(
        map((dto) => ({
          idPago: dto.idPago,
          idReserva: dto.idReserva,
          estado: dto.estado,
          estadoReserva: dto.estadoReserva,
          monto: dto.monto,
          moneda: dto.moneda,
          urlPago: dto.urlPago ?? null,
          fechaExpiracion: dto.fechaExpiracion,
          codigoRechazo: dto.codigoRechazo ?? null,
          motivoRechazo: dto.motivoRechazo ?? null,
        })),
        catchError((error: unknown) => throwError(() => this.aErrorDeDominio(error))),
      );
  }

  private aErrorDeDominio(error: unknown): unknown {
    if (!(error instanceof ApiError)) {
      return error;
    }
    const mensaje = error.message.toLowerCase();

    switch (error.status) {
      case 403:
        return new SinPermisoSobreReservaError(error.message);
      case 404:
        return mensaje.includes('pago iniciado')
          ? new PagoNoIniciadoError(error.message)
          : new ReservaNoEncontradaError(error.message);
      case 409:
        // Tres 409 distintos: el backend solo los distingue por su mensaje.
        if (mensaje.includes('pagada')) {
          return new ReservaYaPagadaError(error.message);
        }
        if (mensaje.includes('agotaron')) {
          return new IntentosDePagoAgotadosError(error.message);
        }
        return new ReservaNoAdmitePagoError(error.message);
      case 422:
        // La pasarela rechaza el monto por pequeño (amount_too_small): reintentar no sirve.
        return new MontoBajoMinimoDePagoError(error.message || undefined);
      case 502:
        // En un 5xx el ApiError trae un mensaje genérico: se usa el propio de la pantalla.
        return new PasarelaDePagoNoDisponibleError();
      default:
        return error;
    }
  }
}
