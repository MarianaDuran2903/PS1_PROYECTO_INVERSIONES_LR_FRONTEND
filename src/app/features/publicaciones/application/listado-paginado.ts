import { computed, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription } from 'rxjs';
import { Pagina } from '../domain/models/publicacion';

/** Elementos por página. Se envía siempre; la primera página es la 0. */
export const TAMANO_PAGINA = 10;

export type EstadoListado = 'cargando' | 'listo' | 'error';

interface ListadoState<T> {
  estado: EstadoListado;
  paginaSolicitada: number;
  resultado: Pagina<T> | null;
}

/**
 * Lógica de un listado paginado que comparten las facades de "Mis publicaciones" y del listado
 * público de alojamientos: pide una página a la vez y la expone tal como llega (el backend ya la
 * ordena y filtra), con los estados cargando, listo, error y vacía, y la navegación entre páginas.
 *
 * No es un servicio: cada facade crea su instancia con la función que pide la página y con el
 * mensaje de respaldo para la lista vacía.
 */
export class ListadoPaginado<T> {
  private readonly state = signal<ListadoState<T>>({
    estado: 'cargando',
    paginaSolicitada: 0,
    resultado: null,
  });
  private peticion: Subscription | undefined;

  readonly estado = computed(() => this.state().estado);
  readonly elementos = computed(() => this.state().resultado?.contenido ?? []);
  readonly totalElementos = computed(() => this.state().resultado?.totalElementos ?? 0);
  readonly totalPaginas = computed(() => this.state().resultado?.totalPaginas ?? 0);
  /** Página mostrada, empezando en 0. */
  readonly paginaActual = computed(() => this.state().resultado?.pagina ?? 0);

  /** Sin ningún elemento. */
  readonly vacia = computed(() => {
    const { estado, resultado } = this.state();
    return estado === 'listo' && resultado !== null && resultado.totalElementos === 0;
  });
  readonly mensajeVacio = computed(
    () => this.state().resultado?.mensaje ?? this.mensajeVacioPorDefecto,
  );

  /** La paginación solo aparece si hay más de una página. */
  readonly hayVariasPaginas = computed(() => this.totalPaginas() > 1);
  readonly hayAnterior = computed(() => this.paginaActual() > 0);
  readonly haySiguiente = computed(() => this.paginaActual() + 1 < this.totalPaginas());

  constructor(
    private readonly pedir: (pagina: number, tamano: number) => Observable<Pagina<T>>,
    private readonly destroyRef: DestroyRef,
    /** Respaldo si el backend no manda `mensaje` en una lista vacía. */
    private readonly mensajeVacioPorDefecto: string,
  ) {}

  /** Carga una página (la 0 por defecto). Una petición nueva cancela la anterior. */
  cargar(pagina = 0): void {
    this.peticion?.unsubscribe();
    this.state.update((actual) => ({ ...actual, estado: 'cargando', paginaSolicitada: pagina }));

    this.peticion = this.pedir(pagina, TAMANO_PAGINA)
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

  private alCargar(resultado: Pagina<T>, pagina: number): void {
    // Página fuera de rango (p. ej. se vació la última): se muestra la última que sí existe.
    const ultima = resultado.totalPaginas - 1;
    if (resultado.contenido.length === 0 && resultado.totalElementos > 0 && pagina > ultima) {
      this.cargar(Math.max(ultima, 0));
      return;
    }
    this.state.set({ estado: 'listo', paginaSolicitada: pagina, resultado });
  }
}
