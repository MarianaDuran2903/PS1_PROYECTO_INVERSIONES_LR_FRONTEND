import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { catchError, map, Observable, throwError } from 'rxjs';
import { PublicacionInvalidaError } from '../../domain/errors/publicacion.errors';
import {
  CampoPublicacion,
  CatalogoItem,
  ErroresPublicacion,
  NuevaPublicacion,
  Publicacion,
} from '../../domain/models/publicacion';
import { PublicacionRepository } from '../../domain/repositories/publicacion.repository';
import { CatalogoItemDto, PublicacionResponseDto } from '../dtos/publicacion.dto';
import { PublicacionMapper } from '../mappers/publicacion.mapper';

const CAMPOS: readonly CampoPublicacion[] = [
  'titulo',
  'descripcion',
  'direccionTextual',
  'idCiudad',
  'barrioZona',
  'idTipo',
  'capacidad',
  'precioNoche',
];

/** Implementación del puerto PublicacionRepository contra el API REST del backend. */
@Injectable()
export class PublicacionHttpRepository extends PublicacionRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_CONFIG).apiUrl;

  override ciudades(): Observable<CatalogoItem[]> {
    return this.http
      .get<CatalogoItemDto[]>(`${this.apiUrl}/ciudades`)
      .pipe(map((items) => items.map(PublicacionMapper.toCatalogo)));
  }

  override tiposAlojamiento(): Observable<CatalogoItem[]> {
    return this.http
      .get<CatalogoItemDto[]>(`${this.apiUrl}/tipos-alojamiento`)
      .pipe(map((items) => items.map(PublicacionMapper.toCatalogo)));
  }

  override crear(datos: NuevaPublicacion): Observable<Publicacion> {
    return this.http
      .post<PublicacionResponseDto>(
        `${this.apiUrl}/publicaciones`,
        PublicacionMapper.toRequest(datos),
      )
      .pipe(
        map(PublicacionMapper.toDomain),
        catchError((error: unknown) => throwError(() => this.toDomainError(error))),
      );
  }

  /** 400 con `errores` → errores por campo; el resto (401, 403, 500...) pasa como ApiError. */
  private toDomainError(error: unknown): unknown {
    if (!(error instanceof ApiError) || error.status !== 400 || error.fieldErrors.length === 0) {
      return error;
    }
    const errores: ErroresPublicacion = {};
    for (const { field, message } of error.fieldErrors) {
      if ((CAMPOS as readonly string[]).includes(field)) {
        errores[field as CampoPublicacion] = message;
      }
    }
    return new PublicacionInvalidaError(errores);
  }
}
