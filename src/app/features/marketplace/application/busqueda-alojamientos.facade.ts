import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { PaginaAlojamientos } from '../domain/models/busqueda-alojamientos';
import { BusquedaAlojamientosRepository } from '../domain/repositories/busqueda-alojamientos.repository';

export const TAMANO_BUSQUEDA = 12;

interface BusquedaState {
  estado: 'cargando' | 'listo' | 'error';
  paginaSolicitada: number;
  resultado: PaginaAlojamientos | null;
}

@Injectable()
export class BusquedaAlojamientosFacade {
  private readonly repository = inject(BusquedaAlojamientosRepository);
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal<BusquedaState>({
    estado: 'cargando',
    paginaSolicitada: 0,
    resultado: null,
  });

  private peticion?: Subscription;

  readonly estado = computed(() => this.state().estado);
  readonly alojamientos = computed(() => this.state().resultado?.contenido ?? []);
  readonly totalElementos = computed(() => this.state().resultado?.totalElementos ?? 0);
  readonly totalPaginas = computed(() => this.state().resultado?.totalPaginas ?? 0);
  readonly paginaActual = computed(() => this.state().resultado?.pagina ?? 0);
  readonly mensajeVacio = computed(
    () => this.state().resultado?.mensaje ?? 'No hay alojamientos disponibles por el momento',
  );

  readonly hayAnterior = computed(() => this.estado() === 'listo' && this.paginaActual() > 0);

  readonly haySiguiente = computed(
    () => this.estado() === 'listo' && this.paginaActual() + 1 < this.totalPaginas(),
  );

  cargar(pagina = 0): void {
    this.peticion?.unsubscribe();
    this.state.update((actual) => ({
      ...actual,
      estado: 'cargando',
      paginaSolicitada: pagina,
    }));

    this.peticion = this.repository
      .listar(pagina, TAMANO_BUSQUEDA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          if (
            resultado.contenido.length === 0 &&
            resultado.totalElementos > 0 &&
            pagina >= resultado.totalPaginas
          ) {
            this.cargar(Math.max(0, resultado.totalPaginas - 1));
            return;
          }

          this.state.set({
            estado: 'listo',
            paginaSolicitada: pagina,
            resultado,
          });
        },
        error: () => {
          this.state.update((actual) => ({ ...actual, estado: 'error' }));
        },
      });
  }

  anterior(): void {
    if (this.hayAnterior()) {
      this.cargar(this.paginaActual() - 1);
    }
  }

  siguiente(): void {
    if (this.haySiguiente()) {
      this.cargar(this.paginaActual() + 1);
    }
  }

  reintentar(): void {
    this.cargar(this.state().paginaSolicitada);
  }
}
