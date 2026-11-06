import {
  IntervencionPublicacion,
  Publicacion,
} from '@features/publicaciones/domain/models/publicacion';
import { Observable } from 'rxjs';

/**
 * Puerto (Repository) de la intervención administrativa sobre publicaciones.
 *
 * Errores esperados:
 * - obtener: `PublicacionNoEncontradaError` (404)
 * - intervenir: además, `IntervencionInvalidaError` (400 con errores por campo) y
 *   `PublicacionNoEditableError` (409: la publicación está ACTIVA)
 * - cualquier otro fallo (401, 403, 500, sin red) llega como `ApiError`.
 */
export abstract class PublicacionAdminRepository {
  abstract obtener(idPublicacion: number): Observable<Publicacion>;
  abstract intervenir(
    idPublicacion: number,
    intervencion: IntervencionPublicacion,
  ): Observable<Publicacion>;
}
