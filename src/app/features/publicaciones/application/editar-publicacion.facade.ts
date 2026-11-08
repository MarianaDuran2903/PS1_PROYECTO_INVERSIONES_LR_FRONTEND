import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { forkJoin } from 'rxjs';
import {
  PublicacionAjenaError,
  PublicacionInvalidaError,
  PublicacionNoEditableError,
  PublicacionNoEncontradaError,
} from '../domain/errors/publicacion.errors';
import {
  ActualizarPublicacion,
  CatalogoItem,
  ErroresPublicacion,
  motivoNoEditable,
  Publicacion,
  puedeEditar,
} from '../domain/models/publicacion';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';
import { leerIdPublicacion } from './id-publicacion';

export type EstadoCarga = 'cargando' | 'listo' | 'error';
export type EstadoGuardadoEdicion = 'inactivo' | 'enviando' | 'exitoso' | 'error';

interface EditarPublicacionState {
  carga: EstadoCarga;
  ciudades: CatalogoItem[];
  tipos: CatalogoItem[];
  publicacion: Publicacion | null;
  guardado: EstadoGuardadoEdicion;
  mensajeError: string | null;
  erroresCampo: ErroresPublicacion;
  /** Mensaje del 409: el estado cambió mientras el formulario estaba abierto. */
  conflicto: string | null;
}

const ESTADO_INICIAL: EditarPublicacionState = {
  carga: 'cargando',
  ciudades: [],
  tipos: [],
  publicacion: null,
  guardado: 'inactivo',
  mensajeError: null,
  erroresCampo: {},
  conflicto: null,
};

const MENSAJE_GENERICO = 'No fue posible guardar los cambios. Inténtalo de nuevo más tarde.';
const RUTA_LISTADO = ['/anfitrion', 'publicaciones'];

/**
 * Facade / caso de uso "Editar publicación propia" (Anfitrión). Carga la publicación y los
 * catálogos, decide según el estado si se puede editar y guarda los cambios.
 * - 403 y 404: avisa y vuelve al listado "Mis publicaciones".
 * - 409: el estado ya no permite editar; deja el formulario en solo lectura con el mensaje.
 * - 400: deja los errores por campo y NO toca lo que la persona escribió.
 * - 401: lo resuelve el interceptor (cierra sesión y lleva al login).
 */
@Injectable()
export class EditarPublicacionFacade {
  private readonly repository = inject(PublicacionRepository);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<EditarPublicacionState>(ESTADO_INICIAL);
  private idPublicacion: number | null = null;

  readonly carga = computed(() => this.state().carga);
  readonly ciudades = computed(() => this.state().ciudades);
  readonly tipos = computed(() => this.state().tipos);
  readonly publicacion = computed(() => this.state().publicacion);
  readonly guardado = computed(() => this.state().guardado);
  readonly enviando = computed(() => this.state().guardado === 'enviando');
  readonly guardadoExitoso = computed(() => this.state().guardado === 'exitoso');
  readonly mensajeError = computed(() => this.state().mensajeError);
  readonly erroresCampo = computed(() => this.state().erroresCampo);

  /** Se puede editar solo en BORRADOR o PAUSADA y mientras el servidor no diga lo contrario. */
  readonly editable = computed(() => {
    const { publicacion, conflicto } = this.state();
    return publicacion !== null && conflicto === null && puedeEditar(publicacion.estado);
  });

  /** Por qué el formulario está en solo lectura; null si se puede editar. */
  readonly avisoNoEditable = computed(() => {
    const { publicacion, conflicto } = this.state();
    if (conflicto !== null) {
      return conflicto;
    }
    return publicacion ? motivoNoEditable(publicacion.estado) : null;
  });

  /** Carga la publicación y los catálogos en paralelo. Sirve también para "Reintentar". */
  cargar(idTexto: string | undefined): void {
    const id = leerIdPublicacion(idTexto);
    if (id === null) {
      this.noExiste();
      return;
    }
    this.idPublicacion = id;
    this.state.set({ ...ESTADO_INICIAL, carga: 'cargando' });

    forkJoin({
      ciudades: this.repository.ciudades(),
      tipos: this.repository.tiposAlojamiento(),
      publicacion: this.repository.obtener(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ ciudades, tipos, publicacion }) =>
          this.state.update((actual) => ({
            ...actual,
            carga: 'listo',
            ciudades,
            tipos,
            publicacion,
          })),
        error: (error: unknown) => this.alFallarLaCarga(error),
      });
  }

  guardar(datos: ActualizarPublicacion): void {
    const id = this.idPublicacion;
    // Evita dobles envíos y guardar cuando el estado ya no lo permite.
    if (id === null || this.enviando() || !this.editable()) {
      return;
    }
    this.state.update((actual) => ({
      ...actual,
      guardado: 'enviando',
      mensajeError: null,
      erroresCampo: {},
    }));

    this.repository
      .actualizar(id, datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (publicacion) => {
          this.state.update((actual) => ({ ...actual, guardado: 'exitoso', publicacion }));
          this.toast.success('Cambios guardados');
          void this.router.navigate(RUTA_LISTADO);
        },
        error: (error: unknown) => this.alFallarElGuardado(error),
      });
  }

  private alFallarLaCarga(error: unknown): void {
    if (error instanceof PublicacionNoEncontradaError) {
      this.noExiste();
    } else if (error instanceof PublicacionAjenaError) {
      this.ajena();
    } else {
      this.state.update((actual) => ({ ...actual, carga: 'error' }));
    }
  }

  private alFallarElGuardado(error: unknown): void {
    if (error instanceof PublicacionNoEncontradaError) {
      this.noExiste();
    } else if (error instanceof PublicacionAjenaError) {
      this.ajena();
    } else if (error instanceof PublicacionNoEditableError) {
      this.state.update((actual) => ({
        ...actual,
        guardado: 'inactivo',
        conflicto: error.message,
      }));
    } else if (error instanceof PublicacionInvalidaError) {
      this.state.update((actual) => ({
        ...actual,
        guardado: 'error',
        mensajeError: error.message,
        erroresCampo: error.errores,
      }));
    } else {
      const mensajeError = error instanceof ApiError ? error.message : MENSAJE_GENERICO;
      this.state.update((actual) => ({ ...actual, guardado: 'error', mensajeError }));
    }
  }

  private noExiste(): void {
    this.toast.error('La publicación no existe');
    void this.router.navigate(RUTA_LISTADO);
  }

  private ajena(): void {
    this.toast.error('No puedes editar esta publicación');
    void this.router.navigate(RUTA_LISTADO);
  }
}
