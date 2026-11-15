import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import {
  CatalogoAlojamiento,
  FiltrosBusquedaAlojamientos,
  PaginaAlojamientos,
} from '@features/marketplace/domain/models/busqueda-alojamientos';
import { BusquedaAlojamientosRepository } from '@features/marketplace/domain/repositories/busqueda-alojamientos.repository';
import { map, Observable } from 'rxjs';

interface AlojamientoResumenDto {
  idPublicacion: number;
  titulo: string;
  estado: string;
  ciudad: CatalogoAlojamiento;
  tipo: CatalogoAlojamiento;
  capacidad: number;
  precioNoche: number;
}

interface PaginaAlojamientosDto {
  contenido: AlojamientoResumenDto[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  mensaje?: string | null;
}

@Injectable()
export class BusquedaAlojamientosHttpRepository extends BusquedaAlojamientosRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_CONFIG).apiUrl;

  override listar(
    pagina: number,
    tamano: number,
    filtros: FiltrosBusquedaAlojamientos = {},
  ): Observable<PaginaAlojamientos> {
    let params = new HttpParams().set('pagina', pagina).set('tamano', tamano);

    if (filtros.idCiudad !== undefined) {
      params = params.set('idCiudad', filtros.idCiudad);
    }

    if (filtros.fechaLlegada !== undefined) {
      params = params.set('fechaLlegada', filtros.fechaLlegada);
    }

    if (filtros.fechaSalida !== undefined) {
      params = params.set('fechaSalida', filtros.fechaSalida);
    }

    if (filtros.huespedes !== undefined) {
      params = params.set('huespedes', filtros.huespedes);
    }

    if (filtros.idTipo !== undefined) {
      params = params.set('idTipo', filtros.idTipo);
    }

    if (filtros.precioMinimo !== undefined) {
      params = params.set('precioMinimo', filtros.precioMinimo);
    }

    if (filtros.precioMaximo !== undefined) {
      params = params.set('precioMaximo', filtros.precioMaximo);
    }

    for (const idServicio of new Set(filtros.idsServicios ?? [])) {
      params = params.append('idsServicios', idServicio);
    }

    return this.http.get<PaginaAlojamientosDto>(`${this.apiUrl}/alojamientos`, { params }).pipe(
      map((dto) => ({
        contenido: dto.contenido.map((item) => ({
          idPublicacion: item.idPublicacion,
          titulo: item.titulo,
          ciudad: { ...item.ciudad },
          tipo: { ...item.tipo },
          capacidad: item.capacidad,
          precioNoche: item.precioNoche,
        })),
        pagina: dto.pagina,
        tamano: dto.tamano,
        totalElementos: dto.totalElementos,
        totalPaginas: dto.totalPaginas,
        mensaje: dto.mensaje ?? null,
      })),
    );
  }

  override listarCiudades(): Observable<CatalogoAlojamiento[]> {
    return this.http.get<CatalogoAlojamiento[]>(`${this.apiUrl}/alojamientos/ciudades`);
  }

  override listarTiposAlojamiento(): Observable<CatalogoAlojamiento[]> {
    return this.http.get<CatalogoAlojamiento[]>(`${this.apiUrl}/catalogos/tipos-alojamiento`);
  }

  override listarServicios(): Observable<CatalogoAlojamiento[]> {
    return this.http.get<CatalogoAlojamiento[]>(`${this.apiUrl}/catalogos/servicios`);
  }
}
