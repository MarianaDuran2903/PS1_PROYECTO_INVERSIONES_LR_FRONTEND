import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { OMITIR_AVISO_403 } from '@core/http/http-contexts';
import {
  AlojamientoNoCotizableError,
  CotizacionInvalidaError,
  ErroresCotizacion,
  FechasNoDisponiblesError,
  SinPermisoParaCotizarError,
} from '@features/marketplace/domain/errors/cotizacion.errors';
import {
  Cotizacion,
  DesglosePrecio,
  SolicitudCotizacion,
} from '@features/marketplace/domain/models/cotizacion';
import { CotizacionRepository } from '@features/marketplace/domain/repositories/cotizacion.repository';
import { catchError, map, Observable, throwError } from 'rxjs';

interface CotizacionDto {
  idPublicacion: number;
  fechaLlegada: string;
  fechaSalida: string;
  noches: number;
  precio: Omit<DesglosePrecio, 'serviciosAdicionales'> & {
    serviciosAdicionales?: DesglosePrecio['serviciosAdicionales'] | null;
  };
}

const CAMPOS_COTIZACION = [
  'idPublicacion',
  'fechaLlegada',
  'fechaSalida',
  'huespedes',
  'serviciosAdicionales',
] as const;

/** `POST /cotizaciones`: solo rol Huésped. No reserva ni bloquea las fechas. */
@Injectable()
export class CotizacionHttpRepository extends CotizacionRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_CONFIG).apiUrl;

  override cotizar(solicitud: SolicitudCotizacion): Observable<Cotizacion> {
    const cuerpo: Record<string, unknown> = {
      idPublicacion: solicitud.idPublicacion,
      fechaLlegada: solicitud.fechaLlegada,
      fechaSalida: solicitud.fechaSalida,
    };
    if (solicitud.huespedes !== undefined) {
      cuerpo['huespedes'] = solicitud.huespedes;
    }
    if (solicitud.serviciosAdicionales && solicitud.serviciosAdicionales.length > 0) {
      cuerpo['serviciosAdicionales'] = [...solicitud.serviciosAdicionales];
    }

    return this.http
      .post<CotizacionDto>(`${this.apiUrl}/cotizaciones`, cuerpo, {
        // El 403 lo explica la propia pantalla: no se muestra además el aviso global.
        context: new HttpContext().set(OMITIR_AVISO_403, true),
      })
      .pipe(
        map((dto) => this.aDominio(dto)),
        catchError((error: unknown) => throwError(() => this.aErrorDeDominio(error))),
      );
  }

  /** Se copian los valores tal como llegan: el front no recalcula nada. */
  private aDominio(dto: CotizacionDto): Cotizacion {
    return {
      idPublicacion: dto.idPublicacion,
      fechaLlegada: dto.fechaLlegada,
      fechaSalida: dto.fechaSalida,
      noches: dto.noches,
      precio: {
        ...dto.precio,
        serviciosAdicionales: (dto.precio.serviciosAdicionales ?? []).map((servicio) => ({
          ...servicio,
        })),
      },
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
        return new SinPermisoParaCotizarError();
      case 404:
        return new AlojamientoNoCotizableError(error.message);
      case 409:
        return new FechasNoDisponiblesError(error.message);
      default:
        return error;
    }
  }

  /** `rangoFechasValido` (salida no posterior a la llegada) se muestra en el campo de salida. */
  private invalida(error: ApiError): unknown {
    const errores: ErroresCotizacion = {};
    for (const { field, message } of error.fieldErrors) {
      const campo = field === 'rangoFechasValido' ? 'fechaSalida' : field;
      if ((CAMPOS_COTIZACION as readonly string[]).includes(campo)) {
        errores[campo as keyof ErroresCotizacion] ??= message;
      }
    }
    return Object.keys(errores).length > 0
      ? new CotizacionInvalidaError(errores, error.message)
      : error;
  }
}
