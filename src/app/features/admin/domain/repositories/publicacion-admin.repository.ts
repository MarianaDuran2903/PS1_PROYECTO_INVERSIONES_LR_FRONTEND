import {
  EstadoPublicacion,
  IntervencionPublicacion,
  Pagina,
  Publicacion,
} from '@features/publicaciones/domain/models/publicacion';
import { Observable } from 'rxjs';

/**
 * Puerto (Repository) de la gestión administrativa de publicaciones.
 *
 * Errores esperados:
 * - obtener: `PublicacionNoEncontradaError` (404)
 * - intervenir: además, `IntervencionInvalidaError` (400 con errores por campo) y
 *   `PublicacionNoEditableError` (409: la publicación está ACTIVA)
 * - aprobar: `InformacionMinimaIncompletaError` (400 con los campos pendientes; la publicación
 *   sigue pendiente), `PublicacionNoEncontradaError` (404) y `TransicionNoPermitidaError` (409:
 *   no está en PENDIENTE_REVISION)
 * - rechazar: `MotivoInvalidoError` (400 con `errores.motivo`), `PublicacionNoEncontradaError` (404)
 *   y `TransicionNoPermitidaError` (409)
 * - bloquear: `MotivoInvalidoError` (400 con `errores.motivo`), `PublicacionNoEncontradaError`
 *   (404) y `TransicionNoPermitidaError` (409: es un borrador o ya está bloqueada)
 * - reactivar: `MotivoInvalidoError` (400 con `errores.motivo`), `InformacionMinimaIncompletaError`
 *   (400 con los campos pendientes; la publicación no cambia), `PublicacionNoEncontradaError` (404)
 *   y `TransicionNoPermitidaError` (409: no está PAUSADA ni BLOQUEADA)
 * - listar y listarPendientes: 400 (paginación inválida) llega como `ApiError` con su mensaje
 * - cualquier otro fallo (401, 403, 500, sin red) llega como `ApiError`.
 */
export abstract class PublicacionAdminRepository {
  abstract obtener(idPublicacion: number): Observable<Publicacion>;
  abstract intervenir(
    idPublicacion: number,
    intervencion: IntervencionPublicacion,
  ): Observable<Publicacion>;
  /** Publicaciones en PENDIENTE_REVISION, de la más antigua a la más reciente (`pagina` desde 0). */
  abstract listarPendientes(pagina: number, tamano: number): Observable<Pagina<Publicacion>>;
  /**
   * Todas las publicaciones, de la más reciente a la más antigua (`pagina` desde 0). Con `estado`
   * trae solo las de ese estado; con `null`, todas.
   */
  abstract listar(
    estado: EstadoPublicacion | null,
    pagina: number,
    tamano: number,
  ): Observable<Pagina<Publicacion>>;
  /** Pasa una publicación pendiente a ACTIVA. */
  abstract aprobar(idPublicacion: number): Observable<Publicacion>;
  /** Devuelve una publicación pendiente a BORRADOR, con el motivo para que el Anfitrión la corrija. */
  abstract rechazar(idPublicacion: number, motivo: string): Observable<Publicacion>;
  /** Bloquea una publicación engañosa: queda BLOQUEADA y guarda el motivo para el Anfitrión. */
  abstract bloquear(idPublicacion: number, motivo: string): Observable<Publicacion>;
  /** Devuelve a ACTIVA una publicación pausada o bloqueada, dejando el motivo registrado. */
  abstract reactivar(idPublicacion: number, motivo: string): Observable<Publicacion>;
}
