import { Observable } from 'rxjs';
import {
  ActualizarPublicacion,
  CatalogoItem,
  NuevaPublicacion,
  PaginaPublicaciones,
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
 * - solicitarActivacion: `PublicacionAjenaError` (403), `PublicacionNoEncontradaError` (404),
 *   `InformacionMinimaIncompletaError` (400 con los campos pendientes) y
 *   `TransicionNoPermitidaError` (409: no está en BORRADOR)
 * - pausar: `PublicacionAjenaError` (403), `PublicacionNoEncontradaError` (404) y
 *   `TransicionNoPermitidaError` (409: no está ACTIVA)
 * - listarPropias: 400 (paginación inválida) llega como `ApiError` con su mensaje
 * - cualquier otro fallo (401, 403, 500, sin red) llega como `ApiError`.
 */
export abstract class PublicacionRepository {
  abstract ciudades(): Observable<CatalogoItem[]>;
  abstract tiposAlojamiento(): Observable<CatalogoItem[]>;
  abstract crear(datos: NuevaPublicacion): Observable<Publicacion>;
  abstract obtener(idPublicacion: number): Observable<Publicacion>;
  abstract actualizar(idPublicacion: number, datos: ActualizarPublicacion): Observable<Publicacion>;
  /** Envía un borrador propio a revisión: pasa a PENDIENTE_REVISION si tiene la información mínima. */
  abstract solicitarActivacion(idPublicacion: number): Observable<Publicacion>;
  /** Pausa una publicación activa propia: pasa a PAUSADA y deja de ofrecerse en las búsquedas. */
  abstract pausar(idPublicacion: number): Observable<Publicacion>;
  /** Página de las publicaciones del Anfitrión autenticado (`pagina` empieza en 0). */
  abstract listarPropias(pagina: number, tamano: number): Observable<PaginaPublicaciones>;
}
