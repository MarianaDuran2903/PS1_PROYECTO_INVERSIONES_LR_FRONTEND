import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { forkJoin } from 'rxjs';
import { PublicacionInvalidaError } from '../domain/errors/publicacion.errors';
import {
  CatalogoItem,
  ErroresPublicacion,
  NuevaPublicacion,
  Publicacion,
} from '../domain/models/publicacion';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';

export type EstadoCatalogos = 'cargando' | 'listo' | 'error';
export type EstadoGuardado = 'inactivo' | 'enviando' | 'exitoso' | 'error';

interface CrearPublicacionState {
  catalogos: EstadoCatalogos;
  ciudades: CatalogoItem[];
  tipos: CatalogoItem[];
  guardado: EstadoGuardado;
  publicacion: Publicacion | null;
  mensajeError: string | null;
  erroresCampo: ErroresPublicacion;
}

const ESTADO_INICIAL: CrearPublicacionState = {
  catalogos: 'cargando',
  ciudades: [],
  tipos: [],
  guardado: 'inactivo',
  publicacion: null,
  mensajeError: null,
  erroresCampo: {},
};

const MENSAJE_GENERICO = 'No fue posible guardar la publicación. Inténtalo de nuevo más tarde.';

/**
 * Facade / caso de uso "Crear publicación" (Anfitrión). Carga los catálogos del formulario,
 * guarda la publicación en estado BORRADOR y expone el estado como signals de solo lectura.
 * El 401 y el 403 los resuelve el interceptor (cierra sesión o avisa de permisos).
 */
@Injectable()
export class CrearPublicacionFacade {
  private readonly repository = inject(PublicacionRepository);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<CrearPublicacionState>(ESTADO_INICIAL);

  readonly catalogos = computed(() => this.state().catalogos);
  readonly ciudades = computed(() => this.state().ciudades);
  readonly tipos = computed(() => this.state().tipos);
  readonly guardado = computed(() => this.state().guardado);
  readonly enviando = computed(() => this.state().guardado === 'enviando');
  readonly publicacion = computed(() => this.state().publicacion);
  readonly mensajeError = computed(() => this.state().mensajeError);
  readonly erroresCampo = computed(() => this.state().erroresCampo);

  /** Pide ciudades y tipos en paralelo; también sirve para "Reintentar". */
  cargarCatalogos(): void {
    this.state.update((actual) => ({ ...actual, catalogos: 'cargando' }));

    forkJoin({
      ciudades: this.repository.ciudades(),
      tipos: this.repository.tiposAlojamiento(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ ciudades, tipos }) =>
          this.state.update((actual) => ({ ...actual, catalogos: 'listo', ciudades, tipos })),
        error: () => this.state.update((actual) => ({ ...actual, catalogos: 'error' })),
      });
  }

  crear(datos: NuevaPublicacion): void {
    // Evita dobles envíos que crearían la publicación dos veces.
    if (this.enviando()) {
      return;
    }
    this.state.update((actual) => ({
      ...actual,
      guardado: 'enviando',
      mensajeError: null,
      erroresCampo: {},
    }));

    this.repository
      .crear(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (publicacion) => {
          this.state.update((actual) => ({ ...actual, guardado: 'exitoso', publicacion }));
          this.toast.success('Publicación guardada como borrador');
        },
        error: (error: unknown) =>
          this.state.update((actual) => ({
            ...actual,
            guardado: 'error',
            ...this.describirError(error),
          })),
      });
  }

  /** Vuelve al formulario vacío para crear otra publicación. */
  crearOtra(): void {
    this.state.update((actual) => ({
      ...actual,
      guardado: 'inactivo',
      publicacion: null,
      mensajeError: null,
      erroresCampo: {},
    }));
  }

  private describirError(
    error: unknown,
  ): Pick<CrearPublicacionState, 'mensajeError' | 'erroresCampo'> {
    if (error instanceof PublicacionInvalidaError) {
      return { mensajeError: error.message, erroresCampo: error.errores };
    }
    if (error instanceof ApiError) {
      return { mensajeError: error.message, erroresCampo: {} };
    }
    return { mensajeError: MENSAJE_GENERICO, erroresCampo: {} };
  }
}
