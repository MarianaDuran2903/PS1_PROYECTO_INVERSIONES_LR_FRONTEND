import { Observable } from 'rxjs';
import {
  ActualizarPublicacion,
  CatalogoItem,
  NuevaPublicacion,
  Publicacion,
} from '../models/publicacion';

/**
 * Puerto (Repository) de publicaciones y de los catálogos que necesita el formulario.
 *
 * Errores esperados:
 * - crear: `PublicacionInvalidaError` (400 con errores por campo)
 * - obtener: `PublicacionNoEncontradaError` (404), `PublicacionAjenaError` (403)
 * - actualizar: además de los de obtener, `PublicacionInvalidaError` (400) y
 *   `PublicacionNoEditableError` (409)
 * - cualquier otro fallo (401, 500, sin red) llega como `ApiError`.
 */
export abstract class PublicacionRepository {
  abstract ciudades(): Observable<CatalogoItem[]>;
  abstract tiposAlojamiento(): Observable<CatalogoItem[]>;
  abstract crear(datos: NuevaPublicacion): Observable<Publicacion>;
  abstract obtener(idPublicacion: number): Observable<Publicacion>;
  abstract actualizar(idPublicacion: number, datos: ActualizarPublicacion): Observable<Publicacion>;
}
