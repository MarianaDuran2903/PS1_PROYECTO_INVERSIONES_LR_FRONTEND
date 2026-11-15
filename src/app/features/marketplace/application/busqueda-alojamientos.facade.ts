import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';
import {
  CatalogoAlojamiento,
  FiltrosBusquedaAlojamientos,
  PaginaAlojamientos,
} from '../domain/models/busqueda-alojamientos';
import { BusquedaAlojamientosRepository } from '../domain/repositories/busqueda-alojamientos.repository';

export const TAMANO_BUSQUEDA = 12;

interface BusquedaState {
  estado: 'cargando' | 'listo' | 'error';
  paginaSolicitada: number;
  filtros: FiltrosBusquedaAlojamientos;
  resultado: PaginaAlojamientos | null;
}

interface CiudadesState {
  estado: 'cargando' | 'listo' | 'error';
  ciudades: CatalogoAlojamiento[];
}

interface CaracteristicasState {
  estado: 'cargando' | 'listo' | 'error';
  tipos: CatalogoAlojamiento[];
  servicios: CatalogoAlojamiento[];
}

@Injectable()
export class BusquedaAlojamientosFacade {
  private readonly repository = inject(BusquedaAlojamientosRepository);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<BusquedaState>({
    estado: 'cargando',
    paginaSolicitada: 0,
    filtros: {},
    resultado: null,
  });

  private readonly ciudadesState = signal<CiudadesState>({
    estado: 'cargando',
    ciudades: [],
  });

  private readonly caracteristicasState = signal<CaracteristicasState>({
    estado: 'cargando',
    tipos: [],
    servicios: [],
  });

  private peticionCaracteristicas?: Subscription;
  private peticion?: Subscription;
  private peticionCiudades?: Subscription;

  readonly estado = computed(() => this.state().estado);
  readonly alojamientos = computed(() => this.state().resultado?.contenido ?? []);
  readonly totalElementos = computed(() => this.state().resultado?.totalElementos ?? 0);
  readonly totalPaginas = computed(() => this.state().resultado?.totalPaginas ?? 0);
  readonly paginaActual = computed(() => this.state().resultado?.pagina ?? 0);
  readonly filtrosAplicados = computed(() => this.state().filtros);

  readonly mensajeVacio = computed(() => {
    const sinFiltros = Object.keys(this.state().filtros).length === 0;

    return (
      this.state().resultado?.mensaje ??
      (sinFiltros
        ? 'No hay alojamientos disponibles por el momento'
        : 'No hay alojamientos que coincidan con los filtros seleccionados')
    );
  });

  readonly hayAnterior = computed(() => this.estado() === 'listo' && this.paginaActual() > 0);

  readonly haySiguiente = computed(
    () => this.estado() === 'listo' && this.paginaActual() + 1 < this.totalPaginas(),
  );

  readonly estadoCiudades = computed(() => this.ciudadesState().estado);
  readonly ciudades = computed(() => this.ciudadesState().ciudades);
  readonly estadoCaracteristicas = computed(() => this.caracteristicasState().estado);
  readonly tiposAlojamiento = computed(() => this.caracteristicasState().tipos);
  readonly servicios = computed(() => this.caracteristicasState().servicios);

  cargar(pagina = 0, filtros?: FiltrosBusquedaAlojamientos): void {
    const filtrosAplicados = filtros ?? this.state().filtros;

    this.peticion?.unsubscribe();
    this.state.update((actual) => ({
      ...actual,
      estado: 'cargando',
      paginaSolicitada: pagina,
      filtros: filtrosAplicados,
    }));

    this.peticion = this.repository
      .listar(pagina, TAMANO_BUSQUEDA, filtrosAplicados)
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
            filtros: filtrosAplicados,
            resultado,
          });
        },
        error: () => {
          this.state.update((actual) => ({ ...actual, estado: 'error' }));
        },
      });
  }

  cargarCiudades(): void {
    this.peticionCiudades?.unsubscribe();
    this.ciudadesState.set({ estado: 'cargando', ciudades: [] });

    this.peticionCiudades = this.repository
      .listarCiudades()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ciudades) => this.ciudadesState.set({ estado: 'listo', ciudades }),
        error: () =>
          this.ciudadesState.set({
            estado: 'error',
            ciudades: [],
          }),
      });
  }

  reintentarCiudades(): void {
    this.cargarCiudades();
  }

  cargarCaracteristicas(): void {
    this.peticionCaracteristicas?.unsubscribe();

    this.caracteristicasState.set({
      estado: 'cargando',
      tipos: [],
      servicios: [],
    });

    this.peticionCaracteristicas = forkJoin({
      tipos: this.repository.listarTiposAlojamiento(),
      servicios: this.repository.listarServicios(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tipos, servicios }) => {
          this.caracteristicasState.set({
            estado: 'listo',
            tipos,
            servicios,
          });
        },
        error: () => {
          this.caracteristicasState.set({
            estado: 'error',
            tipos: [],
            servicios: [],
          });
        },
      });
  }

  reintentarCaracteristicas(): void {
    this.cargarCaracteristicas();
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
