import { Observable } from 'rxjs';
import {
  CatalogoAlojamiento,
  FiltrosBusquedaAlojamientos,
  PaginaAlojamientos,
} from '../models/busqueda-alojamientos';
import { AlojamientoDetalle } from '@features/marketplace/domain/models/alojamiento-detalle';

export abstract class BusquedaAlojamientosRepository {
  abstract listar(
    pagina: number,
    tamano: number,
    filtros?: FiltrosBusquedaAlojamientos,
  ): Observable<PaginaAlojamientos>;
  abstract obtenerDetalle(idPublicacion: number): Observable<AlojamientoDetalle>;
  abstract listarCiudades(): Observable<CatalogoAlojamiento[]>;
  abstract listarTiposAlojamiento(): Observable<CatalogoAlojamiento[]>;
  abstract listarServicios(): Observable<CatalogoAlojamiento[]>;
}
