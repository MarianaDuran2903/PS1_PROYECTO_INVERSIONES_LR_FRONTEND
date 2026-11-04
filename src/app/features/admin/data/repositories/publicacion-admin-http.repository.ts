import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { PublicacionResponseDto } from '@features/publicaciones/data/dtos/publicacion.dto';
import { PublicacionMapper } from '@features/publicaciones/data/mappers/publicacion.mapper';
import {
  PublicacionNoEditableError,
  PublicacionNoEncontradaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import {
  CampoIntervencion,
  ErroresIntervencion,
  IntervencionPublicacion,
  Publicacion,
} from '@features/publicaciones/domain/models/publicacion';
import { catchError, map, Observable, throwError } from 'rxjs';
import { IntervencionInvalidaError } from '../../domain/errors/intervencion.errors';
import { PublicacionAdminRepository } from '../../domain/repositories/publicacion-admin.repository';
import { EdicionAdministrativaRequestDto } from '../dtos/edicion-administrativa.dto';

const CAMPOS: readonly CampoIntervencion[] = [
  'motivo',
  'titulo',
  'descripcion',
  'direccionTextual',
  'idCiudad',
  'barrioZona',
  'idTipo',
  'capacidad',
  'precioNoche',
  'tarifaLimpieza',
  'reglas',
];

/** El backend nombra los errores de los datos como `cambios.capacidad`; aquí se usa `capacidad`. */
const PREFIJO_CAMBIOS = 'cambios.';

/** Implementación del puerto PublicacionAdminRepository contra el API REST del backend. */
@Injectable()
export class PublicacionAdminHttpRepository extends PublicacionAdminRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_CONFIG).apiUrl}/admin/publicaciones`;

  override obtener(idPublicacion: number): Observable<Publicacion> {
    return this.http.get<PublicacionResponseDto>(`${this.baseUrl}/${idPublicacion}`).pipe(
      map(PublicacionMapper.toDomain),
      catchError((error: unknown) => throwError(() => this.aErrorDeDominio(error))),
    );
  }

  override intervenir(
    idPublicacion: number,
    intervencion: IntervencionPublicacion,
  ): Observable<Publicacion> {
    const cuerpo: EdicionAdministrativaRequestDto = {
      motivo: intervencion.motivo.trim(),
      cambios: PublicacionMapper.toActualizarRequest(intervencion.cambios),
    };
    return this.http.put<PublicacionResponseDto>(`${this.baseUrl}/${idPublicacion}`, cuerpo).pipe(
      map(PublicacionMapper.toDomain),
      catchError((error: unknown) => throwError(() => this.aErrorDeDominio(error))),
    );
  }

  /** 404 y 409 con su error de dominio; 400 con `errores` → por campo; el resto pasa como ApiError. */
  private aErrorDeDominio(error: unknown): unknown {
    if (!(error instanceof ApiError)) {
      return error;
    }
    if (error.status === 404) {
      return new PublicacionNoEncontradaError();
    }
    if (error.status === 409) {
      return new PublicacionNoEditableError(error.message);
    }
    if (error.status === 400 && error.fieldErrors.length > 0) {
      const errores: ErroresIntervencion = {};
      for (const { field, message } of error.fieldErrors) {
        const campo = field.startsWith(PREFIJO_CAMBIOS)
          ? field.slice(PREFIJO_CAMBIOS.length)
          : field;
        if ((CAMPOS as readonly string[]).includes(campo)) {
          errores[campo as CampoIntervencion] = message;
        }
      }
      return new IntervencionInvalidaError(errores);
    }
    return error;
  }
}
