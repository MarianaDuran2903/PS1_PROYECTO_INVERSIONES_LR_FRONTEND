import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import {
  PaginaPublicacionesCompletasResponseDto,
  PublicacionResponseDto,
} from '@features/publicaciones/data/dtos/publicacion.dto';
import { PublicacionMapper } from '@features/publicaciones/data/mappers/publicacion.mapper';
import {
  InformacionMinimaIncompletaError,
  PublicacionNoEditableError,
  PublicacionNoEncontradaError,
  TransicionNoPermitidaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import {
  CampoIntervencion,
  CampoPendienteActivacion,
  ErroresIntervencion,
  IntervencionPublicacion,
  Pagina,
  PendientesActivacion,
  Publicacion,
} from '@features/publicaciones/domain/models/publicacion';
import { catchError, map, Observable, throwError } from 'rxjs';
import { IntervencionInvalidaError } from '../../domain/errors/intervencion.errors';
import { MotivoInvalidoError } from '../../domain/errors/revision.errors';
import { PublicacionAdminRepository } from '../../domain/repositories/publicacion-admin.repository';
import { EdicionAdministrativaRequestDto } from '../dtos/edicion-administrativa.dto';
import { RechazoPublicacionRequestDto } from '../dtos/revision.dto';

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

/** Campos que el backend puede devolver como pendientes al aprobar una publicación. */
const CAMPOS_PENDIENTES: readonly CampoPendienteActivacion[] = [
  'descripcion',
  'direccionTextual',
  'barrioZona',
  'reglas',
];

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

  override listarPendientes(pagina: number, tamano: number): Observable<Pagina<Publicacion>> {
    const params = new HttpParams().set('pagina', pagina).set('tamano', tamano);
    return this.http
      .get<PaginaPublicacionesCompletasResponseDto>(`${this.baseUrl}/pendientes`, { params })
      .pipe(map(PublicacionMapper.toPaginaCompleta));
  }

  override aprobar(idPublicacion: number): Observable<Publicacion> {
    return this.http
      .post<PublicacionResponseDto>(`${this.baseUrl}/${idPublicacion}/aprobar`, null)
      .pipe(
        map(PublicacionMapper.toDomain),
        catchError((error: unknown) => throwError(() => this.errorDeAprobacion(error))),
      );
  }

  override rechazar(idPublicacion: number, motivo: string): Observable<Publicacion> {
    const cuerpo: RechazoPublicacionRequestDto = { motivo: motivo.trim() };
    return this.http
      .post<PublicacionResponseDto>(`${this.baseUrl}/${idPublicacion}/rechazar`, cuerpo)
      .pipe(
        map(PublicacionMapper.toDomain),
        catchError((error: unknown) => throwError(() => this.errorDeRechazo(error))),
      );
  }

  /** 404 y 409 de la revisión: la publicación no existe o ya no está en PENDIENTE_REVISION. */
  private errorDeRevision(error: ApiError): unknown {
    if (error.status === 404) {
      return new PublicacionNoEncontradaError();
    }
    if (error.status === 409) {
      return new TransicionNoPermitidaError(error.message);
    }
    return null;
  }

  /** 400 con campos pendientes → información mínima incompleta; 404 y 409 con su error de dominio. */
  private errorDeAprobacion(error: unknown): unknown {
    if (!(error instanceof ApiError)) {
      return error;
    }
    if (error.status === 400) {
      const pendientes: PendientesActivacion = {};
      for (const { field, message } of error.fieldErrors) {
        if ((CAMPOS_PENDIENTES as readonly string[]).includes(field)) {
          pendientes[field as CampoPendienteActivacion] = message;
        }
      }
      if (Object.keys(pendientes).length > 0) {
        return new InformacionMinimaIncompletaError(pendientes, error.message);
      }
    }
    return this.errorDeRevision(error) ?? error;
  }

  /** 400 con `errores.motivo` → motivo inválido; 404 y 409 con su error de dominio. */
  private errorDeRechazo(error: unknown): unknown {
    if (!(error instanceof ApiError)) {
      return error;
    }
    if (error.status === 400) {
      const motivo = error.fieldErrors.find(({ field }) => field === 'motivo');
      if (motivo) {
        return new MotivoInvalidoError(motivo.message);
      }
    }
    return this.errorDeRevision(error) ?? error;
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
