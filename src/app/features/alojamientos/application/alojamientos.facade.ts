import { DestroyRef, inject, Injectable } from '@angular/core';
import { ListadoPaginado } from '@features/publicaciones/application/listado-paginado';
import { PublicacionResumen } from '@features/publicaciones/domain/models/publicacion';
import { AlojamientoRepository } from '../domain/repositories/alojamiento.repository';

/** Respaldo si el backend no manda `mensaje` en una lista vacía. */
const MENSAJE_SIN_ALOJAMIENTOS = 'No hay alojamientos disponibles por el momento';

/**
 * Facade / caso de uso "Ver los alojamientos disponibles" (Visitante o Huésped). Pide al backend
 * una página de alojamientos activos y la expone tal como llega: el backend ya deja fuera las
 * publicaciones que no están activas y las ordena de la más reciente a la más antigua. La
 * paginación y los estados son los de `ListadoPaginado`, los mismos de "Mis publicaciones".
 */
@Injectable()
export class AlojamientosFacade {
  private readonly repository = inject(AlojamientoRepository);
  private readonly listado = new ListadoPaginado<PublicacionResumen>(
    (pagina, tamano) => this.repository.listar(pagina, tamano),
    inject(DestroyRef),
    MENSAJE_SIN_ALOJAMIENTOS,
  );

  readonly estado = this.listado.estado;
  readonly alojamientos = this.listado.elementos;
  readonly totalElementos = this.listado.totalElementos;
  readonly totalPaginas = this.listado.totalPaginas;
  /** Página mostrada, empezando en 0. */
  readonly paginaActual = this.listado.paginaActual;

  /** No hay ningún alojamiento disponible. */
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
