import { Observable } from 'rxjs';
import {
  CatalogoAlojamiento,
  FiltrosBusquedaAlojamientos,
  PaginaAlojamientos,
} from '../models/busqueda-alojamientos';

export abstract class BusquedaAlojamientosRepository {
  abstract listar(
    pagina: number,
    tamano: number,
    filtros?: FiltrosBusquedaAlojamientos,
  ): Observable<PaginaAlojamientos>;
  abstract listarCiudades(): Observable<CatalogoAlojamiento[]>;
}
