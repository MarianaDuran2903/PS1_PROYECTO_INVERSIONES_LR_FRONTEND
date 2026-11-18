import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ListadoPaginado } from '@features/publicaciones/application/listado-paginado';
import {
  EstadoPublicacion,
  Pagina,
  Publicacion,
} from '@features/publicaciones/domain/models/publicacion';
import { Observable } from 'rxjs';
import { PublicacionAdminRepository } from '../domain/repositories/publicacion-admin.repository';
import { DecisionesPublicacionFacade } from './decisiones-publicacion.facade';

export type Pestana = 'pendientes' | 'activas' | 'pausadas' | 'bloqueadas' | 'todas';

export interface DefinicionPestana {
  clave: Pestana;
  etiqueta: string;
  /** Estado que se pide al backend; null en "Todas" (sin filtro). */
  estado: EstadoPublicacion | null;
}

/** Pestañas de la gestión, en el orden en que se muestran. */
export const PESTANAS: readonly DefinicionPestana[] = [
  { clave: 'pendientes', etiqueta: 'Pendientes', estado: 'PENDIENTE_REVISION' },
  { clave: 'activas', etiqueta: 'Activas', estado: 'ACTIVA' },
  { clave: 'pausadas', etiqueta: 'Pausadas', estado: 'PAUSADA' },
  { clave: 'bloqueadas', etiqueta: 'Bloqueadas', estado: 'BLOQUEADA' },
  { clave: 'todas', etiqueta: 'Todas', estado: null },
];

/** Respaldo si el backend no manda `mensaje` en una lista vacía. */
const MENSAJE_SIN_PUBLICACIONES = 'No hay publicaciones para mostrar';

/**
 * Facade / caso de uso "Gestionar publicaciones" (Administrador): una lista por pestaña, de a una
 * página (la lógica es la de `ListadoPaginado`, la misma de "Mis publicaciones").
 * - Pendientes usa `listarPendientes`; Activas, Pausadas, Bloqueadas y Todas usan `listar` con su
 *   estado (Todas, sin estado).
 * - Cambiar de pestaña vuelve a la primera página y cancela la petición anterior.
 * - Las decisiones (aprobar, rechazar, bloquear y reactivar) son las de `DecisionesPublicacionFacade`;
 *   al terminar una, o si el estado real era otro, se recarga la página que se estaba viendo.
 */
@Injectable()
export class GestionPublicacionesFacade {
  private readonly repository = inject(PublicacionAdminRepository);
  private readonly decisiones = inject(DecisionesPublicacionFacade);

  private readonly pestanaActual = signal<Pestana>('pendientes');
  private readonly listado = new ListadoPaginado<Publicacion>(
    (pagina, tamano) => this.pedir(pagina, tamano),
    inject(DestroyRef),
    MENSAJE_SIN_PUBLICACIONES,
  );

  readonly pestana = this.pestanaActual.asReadonly();
  readonly estado = this.listado.estado;
  readonly publicaciones = this.listado.elementos;
  readonly totalElementos = this.listado.totalElementos;
  readonly totalPaginas = this.listado.totalPaginas;
  /** Página mostrada, empezando en 0. */
  readonly paginaActual = this.listado.paginaActual;

  /** La pestaña no tiene ninguna publicación. */
  readonly vacia = this.listado.vacia;
  readonly mensajeVacio = this.listado.mensajeVacio;

  /** La paginación solo aparece si hay más de una página. */
  readonly hayVariasPaginas = this.listado.hayVariasPaginas;
  readonly hayAnterior = this.listado.hayAnterior;
  readonly haySiguiente = this.listado.haySiguiente;

  constructor() {
    this.decisiones.resultado$.pipe(takeUntilDestroyed()).subscribe((resultado) => {
      if (resultado === 'hecha' || resultado === 'desactualizada') {
        this.listado.cargar(this.listado.paginaActual());
      }
    });
  }

  /** Carga la primera página de la pestaña activa. */
  cargar(): void {
    this.listado.cargar(0);
  }

  /** Cambia de pestaña y muestra su primera página. */
  seleccionar(pestana: Pestana): void {
    this.pestanaActual.set(pestana);
    this.listado.cargar(0);
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

  /** Título de una publicación de la lista, para nombrarla en los avisos y cuadros. */
  tituloDe(idPublicacion: number | null): string | null {
    return (
      this.publicaciones().find((publicacion) => publicacion.idPublicacion === idPublicacion)
        ?.titulo ?? null
    );
  }

  /** Publicación de la lista con ese id, si está en la página que se muestra. */
  publicacionDe(idPublicacion: number | null): Publicacion | null {
    return (
      this.publicaciones().find((publicacion) => publicacion.idPublicacion === idPublicacion) ??
      null
    );
  }

  private pedir(pagina: number, tamano: number): Observable<Pagina<Publicacion>> {
    return this.pestanaActual() === 'pendientes'
      ? this.repository.listarPendientes(pagina, tamano)
      : this.repository.listar(this.estadoDe(this.pestanaActual()), pagina, tamano);
  }

  private estadoDe(pestana: Pestana): EstadoPublicacion | null {
    return PESTANAS.find((definicion) => definicion.clave === pestana)?.estado ?? null;
  }
}
