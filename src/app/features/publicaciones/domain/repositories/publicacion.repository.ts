import { Observable } from 'rxjs';
import { CatalogoItem, NuevaPublicacion, Publicacion } from '../models/publicacion';

/**
 * Puerto (Repository) de publicaciones y de los catálogos que necesita el formulario.
 *
 * Errores esperados:
 * - crear: `PublicacionInvalidaError` (400 con errores por campo)
 * - cualquier otro fallo (401, 403, 500, sin red) llega como `ApiError`.
 */
export abstract class PublicacionRepository {
  abstract ciudades(): Observable<CatalogoItem[]>;
  abstract tiposAlojamiento(): Observable<CatalogoItem[]>;
  abstract crear(datos: NuevaPublicacion): Observable<Publicacion>;
}
