import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import {
  AlojamientoResumen,
  PaginaAlojamientos,
} from '@features/marketplace/domain/models/busqueda-alojamientos';
import { BusquedaAlojamientosRepository } from '@features/marketplace/domain/repositories/busqueda-alojamientos.repository';
import { map, Observable } from 'rxjs';

interface AlojamientoResumenDto extends AlojamientoResumen {
  estado: string;
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

  override listar(pagina: number, tamano: number): Observable<PaginaAlojamientos> {
    const params = new HttpParams().set('pagina', pagina).set('tamano', tamano);

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
}
