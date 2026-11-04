import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { leerIdPublicacion } from '@features/publicaciones/application/id-publicacion';
import {
  PublicacionNoEditableError,
  PublicacionNoEncontradaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import {
  CatalogoItem,
  ErroresIntervencion,
  IntervencionPublicacion,
  Publicacion,
} from '@features/publicaciones/domain/models/publicacion';
import { PublicacionRepository } from '@features/publicaciones/domain/repositories/publicacion.repository';
import { forkJoin } from 'rxjs';
import { IntervencionInvalidaError } from '../domain/errors/intervencion.errors';
import { exigeReglas, motivoNoIntervenible, puedeIntervenir } from '../domain/models/intervencion';
import { PublicacionAdminRepository } from '../domain/repositories/publicacion-admin.repository';

export type EstadoCargaIntervencion = 'cargando' | 'listo' | 'error';
export type EstadoGuardadoIntervencion = 'inactivo' | 'enviando' | 'exitoso' | 'error';

interface IntervenirPublicacionState {
  carga: EstadoCargaIntervencion;
  ciudades: CatalogoItem[];
  tipos: CatalogoItem[];
  publicacion: Publicacion | null;
  guardado: EstadoGuardadoIntervencion;
  mensajeError: string | null;
  erroresCampo: ErroresIntervencion;
  /** Mensaje del 409: el estado cambió mientras el formulario estaba abierto. */
  conflicto: string | null;
}

const ESTADO_INICIAL: IntervenirPublicacionState = {
  carga: 'cargando',
  ciudades: [],
  tipos: [],
  publicacion: null,
  guardado: 'inactivo',
  mensajeError: null,
  erroresCampo: {},
  conflicto: null,
};

const MENSAJE_GENERICO = 'No fue posible guardar la intervención. Inténtalo de nuevo más tarde.';
const RUTA_ADMIN = ['/admin'];
const RUTA_SIN_PERMISOS = ['/acceso-denegado'];

/**
 * Facade / caso de uso "Intervenir una publicación" (Administrador). Carga la publicación (de
 * cualquier Anfitrión) y los catálogos, decide según el estado si se puede intervenir y guarda
 * los cambios con su motivo; el backend registra quién, cuándo y por qué.
 * - ACTIVA: solo lectura con el mensaje del backend (hay que pausarla antes).
 * - 400: deja los errores por campo y NO toca lo que la persona escribió.
 * - 409: el estado ya no lo permite; pasa a solo lectura con el mensaje.
 * - 404: avisa y vuelve al panel de administración. 403: lleva a "Sin permisos".
 * - 401: lo resuelve el interceptor (cierra sesión y lleva al login).
 */
@Injectable()
export class IntervenirPublicacionFacade {
  private readonly repositorioAdmin = inject(PublicacionAdminRepository);
  private readonly catalogos = inject(PublicacionRepository);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<IntervenirPublicacionState>(ESTADO_INICIAL);
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

  /** Se puede intervenir en cualquier estado salvo ACTIVA, y mientras el servidor no diga lo contrario. */
  readonly editable = computed(() => {
    const { publicacion, conflicto } = this.state();
    return publicacion !== null && conflicto === null && puedeIntervenir(publicacion.estado);
  });

  /** Por qué el formulario está en solo lectura; null si se puede intervenir. */
  readonly avisoNoEditable = computed(() => {
    const { publicacion, conflicto } = this.state();
    if (conflicto !== null) {
      return conflicto;
    }
    return publicacion ? motivoNoIntervenible(publicacion.estado) : null;
  });

  /** En una publicación en revisión las reglas no pueden quedar vacías. */
  readonly reglasObligatorias = computed(() => {
    const publicacion = this.state().publicacion;
    return publicacion !== null && exigeReglas(publicacion.estado);
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
      ciudades: this.catalogos.ciudades(),
      tipos: this.catalogos.tiposAlojamiento(),
      publicacion: this.repositorioAdmin.obtener(id),
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

  guardar(intervencion: IntervencionPublicacion): void {
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

    this.repositorioAdmin
      .intervenir(id, intervencion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (publicacion) => {
          this.state.update((actual) => ({ ...actual, guardado: 'exitoso', publicacion }));
          this.toast.success('Intervención registrada');
          void this.router.navigate(RUTA_ADMIN);
        },
        error: (error: unknown) => this.alFallarElGuardado(error),
      });
  }

  private alFallarLaCarga(error: unknown): void {
    if (error instanceof PublicacionNoEncontradaError) {
      this.noExiste();
    } else if (esSinPermisos(error)) {
      void this.router.navigate(RUTA_SIN_PERMISOS);
    } else {
      this.state.update((actual) => ({ ...actual, carga: 'error' }));
    }
  }

  private alFallarElGuardado(error: unknown): void {
    if (error instanceof PublicacionNoEncontradaError) {
      this.noExiste();
    } else if (esSinPermisos(error)) {
      void this.router.navigate(RUTA_SIN_PERMISOS);
    } else if (error instanceof PublicacionNoEditableError) {
      this.state.update((actual) => ({
        ...actual,
        guardado: 'inactivo',
        conflicto: error.message,
      }));
    } else if (error instanceof IntervencionInvalidaError) {
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
    void this.router.navigate(RUTA_ADMIN);
  }
}

/** 403: la cuenta no tiene rol Administrador. */
function esSinPermisos(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}
