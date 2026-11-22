import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { OMITIR_AVISO_403 } from '@core/http/http-contexts';
import { catchError, map, Observable, throwError } from 'rxjs';
import {
  AlojamientoNoReservableError,
  ErroresReserva,
  FechasNoDisponiblesParaReservarError,
  ReservaInvalidaError,
  SinPermisoParaReservarError,
} from '../../domain/errors/reserva.errors';
import { PrecioReserva, Reserva, SolicitudReserva } from '../../domain/models/reserva';
import { ReservaRepository } from '../../domain/repositories/reserva.repository';

interface ReservaDto {
  idReserva: number;
  idPublicacion: number;
  fechaLlegada: string;
  fechaSalida: string;
  noches: number;
  huespedes: number;
  estado: string;
  fechaExpiracion: string;
  precio: PrecioReserva;
}

const CAMPOS_RESERVA = ['idPublicacion', 'fechaLlegada', 'fechaSalida', 'huespedes'] as const;

/** `POST /reservas` (solo rol HUESPED). Exige el encabezado `Idempotency-Key`. */
@Injectable()
export class ReservaHttpRepository extends ReservaRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_CONFIG).apiUrl;

  override crear(solicitud: SolicitudReserva, claveIdempotencia: string): Observable<Reserva> {
    return this.http
      .post<ReservaDto>(
        `${this.apiUrl}/reservas`,
        {
          idPublicacion: solicitud.idPublicacion,
          fechaLlegada: solicitud.fechaLlegada,
          fechaSalida: solicitud.fechaSalida,
          huespedes: solicitud.huespedes,
        },
        {
          headers: new HttpHeaders({ 'Idempotency-Key': claveIdempotencia }),
          // El 403 lo explica la propia pantalla: no se muestra además el aviso global.
          context: new HttpContext().set(OMITIR_AVISO_403, true),
        },
      )
      .pipe(
        // 201 (reserva nueva) y 200 (repetición con la misma clave) se tratan igual.
        map((dto) => this.aDominio(dto)),
        catchError((error: unknown) => throwError(() => this.aErrorDeDominio(error))),
      );
  }

  private aDominio(dto: ReservaDto): Reserva {
    return {
      idReserva: dto.idReserva,
      idPublicacion: dto.idPublicacion,
      fechaLlegada: dto.fechaLlegada,
      fechaSalida: dto.fechaSalida,
      noches: dto.noches,
      huespedes: dto.huespedes,
      estado: dto.estado,
      fechaExpiracion: dto.fechaExpiracion,
      precio: { ...dto.precio },
    };
  }

  private aErrorDeDominio(error: unknown): unknown {
    if (!(error instanceof ApiError)) {
      return error;
    }
    switch (error.status) {
      case 400:
        return this.invalida(error);
      case 403:
        return new SinPermisoParaReservarError();
      case 404:
        return new AlojamientoNoReservableError(error.message);
      case 409:
        // El otro 409 (clave de idempotencia ya usada con otra solicitud) se propaga tal cual.
        return error.message.toLowerCase().includes('disponibles')
          ? new FechasNoDisponiblesParaReservarError(error.message)
          : error;
      default:
        return error;
    }
  }

  private invalida(error: ApiError): unknown {
    const errores: ErroresReserva = {};
    for (const { field, message } of error.fieldErrors) {
      if ((CAMPOS_RESERVA as readonly string[]).includes(field)) {
        errores[field as keyof ErroresReserva] ??= message;
      }
    }
    return Object.keys(errores).length > 0
      ? new ReservaInvalidaError(errores, error.message)
      : error;
  }
}
