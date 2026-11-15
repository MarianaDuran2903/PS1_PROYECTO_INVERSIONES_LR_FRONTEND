import { Observable } from 'rxjs';
import { PaginaAlojamientos } from '../models/busqueda-alojamientos';

export abstract class BusquedaAlojamientosRepository {
  abstract listar(pagina: number, tamano: number): Observable<PaginaAlojamientos>;
}
