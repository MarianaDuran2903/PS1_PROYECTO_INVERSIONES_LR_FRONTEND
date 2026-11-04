import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { OMITIR_AVISO_403 } from '@core/http/http-contexts';
import { catchError, map, Observable, throwError } from 'rxjs';
import {
  PublicacionAjenaError,
  PublicacionInvalidaError,
  PublicacionNoEditableError,
  PublicacionNoEncontradaError,
} from '../../domain/errors/publicacion.errors';
import {
  ActualizarPublicacion,
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
  'tarifaLimpieza',
  'reglas',
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
        catchError((error: unknown) => throwError(() => this.errorDeCampos(error))),
      );
  }

  override obtener(idPublicacion: number): Observable<Publicacion> {
    return this.http
      .get<PublicacionResponseDto>(`${this.apiUrl}/publicaciones/${idPublicacion}`, {
        context: new HttpContext().set(OMITIR_AVISO_403, true),
      })
      .pipe(
        map(PublicacionMapper.toDomain),
        catchError((error: unknown) => throwError(() => this.errorDeEdicion(error))),
      );
  }

  override actualizar(
    idPublicacion: number,
    datos: ActualizarPublicacion,
  ): Observable<Publicacion> {
    return this.http
      .put<PublicacionResponseDto>(
        `${this.apiUrl}/publicaciones/${idPublicacion}`,
        PublicacionMapper.toActualizarRequest(datos),
        { context: new HttpContext().set(OMITIR_AVISO_403, true) },
      )
      .pipe(
        map(PublicacionMapper.toDomain),
        catchError((error: unknown) => throwError(() => this.errorDeEdicion(error))),
      );
  }

  /** 400 con `errores` → errores por campo; el resto (401, 403, 500...) pasa como ApiError. */
  private errorDeCampos(error: unknown): unknown {
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

  /** Errores de cargar y editar: 403 (ajena), 404 (no existe), 409 (estado) y 400 por campo. */
  private errorDeEdicion(error: unknown): unknown {
    if (error instanceof ApiError) {
      if (error.status === 403) {
        return new PublicacionAjenaError();
      }
      if (error.status === 404) {
        return new PublicacionNoEncontradaError();
      }
      if (error.status === 409) {
        return new PublicacionNoEditableError(error.message);
      }
    }
    return this.errorDeCampos(error);
  }
}
