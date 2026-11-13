import { DestroyRef, inject, Injectable } from '@angular/core';
import { PublicacionResumen } from '../domain/models/publicacion';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';
import { ListadoPaginado } from './listado-paginado';

export { TAMANO_PAGINA } from './listado-paginado';
export type { EstadoListado } from './listado-paginado';

/** Respaldo si el backend no manda `mensaje` en una lista vacía. */
const MENSAJE_SIN_PUBLICACIONES = 'No tiene publicaciones registradas';

/**
 * Facade / caso de uso "Consultar mis publicaciones" (Anfitrión). Pide al backend las
 * publicaciones del Anfitrión autenticado, una página a la vez, y las expone tal como llegan:
 * el backend ya filtra por propietario y las ordena de la más reciente a la más antigua, así que
 * aquí no se filtra ni se reordena nada. La paginación es la de `ListadoPaginado`.
 */
@Injectable()
export class MisPublicacionesFacade {
  private readonly repository = inject(PublicacionRepository);
  private readonly listado = new ListadoPaginado<PublicacionResumen>(
    (pagina, tamano) => this.repository.listarPropias(pagina, tamano),
    inject(DestroyRef),
    MENSAJE_SIN_PUBLICACIONES,
  );

  readonly estado = this.listado.estado;
  readonly publicaciones = this.listado.elementos;
  readonly totalElementos = this.listado.totalElementos;
  readonly totalPaginas = this.listado.totalPaginas;
  /** Página mostrada, empezando en 0. */
  readonly paginaActual = this.listado.paginaActual;

  /** Sin ninguna publicación en la cuenta. */
  readonly vacia = this.listado.vacia;
  readonly mensajeVacio = this.listado.mensajeVacio;

  /** La paginación solo aparece si hay más de una página. */
  readonly hayVariasPaginas = this.listado.hayVariasPaginas;
  readonly hayAnterior = this.listado.hayAnterior;
  readonly haySiguiente = this.listado.haySiguiente;

  /** Carga una página (la 0 por defecto). Una petición nueva cancela la anterior. */
  cargar(pagina = 0): void {
    this.listado.cargar(pagina);
  }

  siguiente(): void {
    this.listado.siguiente();
  }

  anterior(): void {
    this.listado.anterior();
  }

  /** Vuelve a pedir la página que falló. */
  reintentar(): void {
    this.listado.reintentar();
  }
}
