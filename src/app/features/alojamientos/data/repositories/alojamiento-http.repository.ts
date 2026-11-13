import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { PaginaPublicacionesResponseDto } from '@features/publicaciones/data/dtos/publicacion.dto';
import { PublicacionMapper } from '@features/publicaciones/data/mappers/publicacion.mapper';
import { PaginaPublicaciones } from '@features/publicaciones/domain/models/publicacion';
import { map, Observable } from 'rxjs';
import { AlojamientoRepository } from '../../domain/repositories/alojamiento.repository';

/**
 * Implementación del puerto AlojamientoRepository contra el API REST del backend. La ruta es
 * pública: el interceptor de autenticación no le agrega el token ni cierra la sesión por un 401.
 */
@Injectable()
export class AlojamientoHttpRepository extends AlojamientoRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_CONFIG).apiUrl}/alojamientos`;

  override listar(pagina: number, tamano: number): Observable<PaginaPublicaciones> {
    const params = new HttpParams().set('pagina', pagina).set('tamano', tamano);
    return this.http
      .get<PaginaPublicacionesResponseDto>(this.baseUrl, { params })
      .pipe(map(PublicacionMapper.toPagina));
  }
}
