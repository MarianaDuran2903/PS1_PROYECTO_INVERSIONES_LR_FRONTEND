import { PaginaPublicaciones } from '@features/publicaciones/domain/models/publicacion';
import { Observable } from 'rxjs';

/**
 * Puerto (Repository) del listado público de alojamientos disponibles.
 *
 * El listado es público (no lleva token) y trae solo publicaciones ACTIVAS, de la más reciente a
 * la más antigua. Sus elementos son el mismo resumen que usa "Mis publicaciones": no traen
 * dirección ni datos del Anfitrión, y no existe un detalle público por id.
 *
 * Errores esperados: 400 (paginación inválida) y cualquier otro fallo (500, sin red) llegan como
 * `ApiError` con su mensaje.
 */
export abstract class AlojamientoRepository {
  /** Página de alojamientos disponibles (`pagina` empieza en 0). */
  abstract listar(pagina: number, tamano: number): Observable<PaginaPublicaciones>;
}
