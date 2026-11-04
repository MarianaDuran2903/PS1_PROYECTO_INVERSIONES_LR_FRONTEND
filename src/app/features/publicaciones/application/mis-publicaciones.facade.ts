import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { PaginaPublicaciones } from '../domain/models/publicacion';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';

/** Publicaciones por página. Se envía siempre; la primera página es la 0. */
export const TAMANO_PAGINA = 10;

export type EstadoListado = 'cargando' | 'listo' | 'error';

/** Respaldo si el backend no manda `mensaje` en una lista vacía. */
const MENSAJE_SIN_PUBLICACIONES = 'No tiene publicaciones registradas';

interface MisPublicacionesState {
  estado: EstadoListado;
  paginaSolicitada: number;
  resultado: PaginaPublicaciones | null;
}

const ESTADO_INICIAL: MisPublicacionesState = {
  estado: 'cargando',
  paginaSolicitada: 0,
  resultado: null,
};

/**
 * Facade / caso de uso "Consultar mis publicaciones" (Anfitrión). Pide al backend las
 * publicaciones del Anfitrión autenticado, una página a la vez, y las expone tal como llegan:
 * el backend ya filtra por propietario y las ordena de la más reciente a la más antigua, así que
 * aquí no se filtra ni se reordena nada.
 */
@Injectable()
export class MisPublicacionesFacade {
  private readonly repository = inject(PublicacionRepository);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<MisPublicacionesState>(ESTADO_INICIAL);
  private peticion: Subscription | undefined;

  readonly estado = computed(() => this.state().estado);
  readonly publicaciones = computed(() => this.state().resultado?.contenido ?? []);
  readonly totalElementos = computed(() => this.state().resultado?.totalElementos ?? 0);
  readonly totalPaginas = computed(() => this.state().resultado?.totalPaginas ?? 0);
  /** Página mostrada, empezando en 0. */
  readonly paginaActual = computed(() => this.state().resultado?.pagina ?? 0);

  /** Sin ninguna publicación en la cuenta. */
  readonly vacia = computed(() => {
    const { estado, resultado } = this.state();
    return estado === 'listo' && resultado !== null && resultado.totalElementos === 0;
  });
  readonly mensajeVacio = computed(
    () => this.state().resultado?.mensaje ?? MENSAJE_SIN_PUBLICACIONES,
  );

  /** La paginación solo aparece si hay más de una página. */
  readonly hayVariasPaginas = computed(() => this.totalPaginas() > 1);
  readonly hayAnterior = computed(() => this.paginaActual() > 0);
  readonly haySiguiente = computed(() => this.paginaActual() + 1 < this.totalPaginas());

  /** Carga una página (la 0 por defecto). Una petición nueva cancela la anterior. */
  cargar(pagina = 0): void {
    this.peticion?.unsubscribe();
    this.state.update((actual) => ({ ...actual, estado: 'cargando', paginaSolicitada: pagina }));

    this.peticion = this.repository
      .listarPropias(pagina, TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => this.alCargar(resultado, pagina),
        error: () => this.state.update((actual) => ({ ...actual, estado: 'error' })),
      });
  }

  siguiente(): void {
    if (this.haySiguiente()) {
      this.cargar(this.paginaActual() + 1);
    }
  }

  anterior(): void {
    if (this.hayAnterior()) {
      this.cargar(this.paginaActual() - 1);
    }
  }

  /** Vuelve a pedir la página que falló. */
  reintentar(): void {
    this.cargar(this.state().paginaSolicitada);
  }

  private alCargar(resultado: PaginaPublicaciones, pagina: number): void {
    // Página fuera de rango (p. ej. se vació la última): se muestra la última que sí existe.
    const ultima = resultado.totalPaginas - 1;
    if (resultado.contenido.length === 0 && resultado.totalElementos > 0 && pagina > ultima) {
      this.cargar(Math.max(ultima, 0));
      return;
    }
    this.state.set({ estado: 'listo', paginaSolicitada: pagina, resultado });
  }
}
