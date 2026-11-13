import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/http/api-error';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import type { PendienteActivacion } from '@features/publicaciones/application/solicitar-activacion.facade';
import {
  InformacionMinimaIncompletaError,
  PublicacionNoEncontradaError,
  TransicionNoPermitidaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import { Pagina, Publicacion } from '@features/publicaciones/domain/models/publicacion';
import { Subscription } from 'rxjs';
import { MotivoInvalidoError } from '../domain/errors/revision.errors';
import { PublicacionAdminRepository } from '../domain/repositories/publicacion-admin.repository';

/** Publicaciones por página. Se envía siempre; la primera página es la 0. */
export const TAMANO_PAGINA = 10;

export type EstadoBandeja = 'cargando' | 'listo' | 'error';
export type AccionRevision = 'aprobar' | 'rechazar';

/** Respaldo si el backend no manda `mensaje` en una lista vacía. */
const MENSAJE_SIN_PENDIENTES = 'No hay publicaciones pendientes de revisión';
const MENSAJE_GENERICO = 'Inténtalo de nuevo en unos minutos.';

/** Lo que falta en una publicación que no se pudo aprobar, para mostrarlo en su tarjeta. */
export interface AvisoAprobacion {
  mensaje: string;
  pendientes: PendienteActivacion[];
}

interface BandejaState {
  estado: EstadoBandeja;
  paginaSolicitada: number;
  resultado: Pagina<Publicacion> | null;
}

const ESTADO_INICIAL: BandejaState = { estado: 'cargando', paginaSolicitada: 0, resultado: null };

/**
 * Facade / caso de uso "Revisar publicaciones pendientes" (Administrador). Carga la bandeja, una
 * página a la vez y tal como llega (de la más antigua a la más reciente), y ejecuta las dos
 * decisiones:
 * - Aprobar: pide confirmación. Con éxito avisa y recarga. Con 400 (falta información mínima)
 *   deja los campos pendientes en la tarjeta y la publicación sigue pendiente. Con 404 o 409
 *   avisa con el mensaje del backend y recarga, porque el estado real es otro.
 * - Rechazar: abre el cuadro del motivo. Con éxito avisa y recarga; con un motivo inválido deja el
 *   error en el cuadro para que se corrija.
 * - 401 y 403: los resuelve el interceptor.
 */
@Injectable()
export class BandejaPendientesFacade {
  private readonly repository = inject(PublicacionAdminRepository);
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<BandejaState>(ESTADO_INICIAL);
  private readonly enCurso = signal<{ id: number; accion: AccionRevision } | null>(null);
  private readonly avisos = signal<Record<number, AvisoAprobacion>>({});
  private readonly rechazo = signal<{ id: number; error: string | null } | null>(null);
  private peticion: Subscription | undefined;

  readonly estado = computed(() => this.state().estado);
  readonly publicaciones = computed(() => this.state().resultado?.contenido ?? []);
  readonly totalElementos = computed(() => this.state().resultado?.totalElementos ?? 0);
  readonly totalPaginas = computed(() => this.state().resultado?.totalPaginas ?? 0);
  /** Página mostrada, empezando en 0. */
  readonly paginaActual = computed(() => this.state().resultado?.pagina ?? 0);

  /** Sin ninguna publicación pendiente. */
  readonly vacia = computed(() => {
    const { estado, resultado } = this.state();
    return estado === 'listo' && resultado !== null && resultado.totalElementos === 0;
  });
  readonly mensajeVacio = computed(() => this.state().resultado?.mensaje ?? MENSAJE_SIN_PENDIENTES);

  readonly hayVariasPaginas = computed(() => this.totalPaginas() > 1);
  readonly hayAnterior = computed(() => this.paginaActual() > 0);
  readonly haySiguiente = computed(() => this.paginaActual() + 1 < this.totalPaginas());

  /** Hay una decisión en curso: los botones de las demás tarjetas esperan. */
  readonly ocupado = computed(() => this.enCurso() !== null);
  readonly idEnCurso = computed(() => this.enCurso()?.id ?? null);
  readonly accionEnCurso = computed(() => this.enCurso()?.accion ?? null);
  /** Publicación que se está rechazando; null si el cuadro del motivo está cerrado. */
  readonly idARechazar = computed(() => this.rechazo()?.id ?? null);
  readonly errorMotivo = computed(() => this.rechazo()?.error ?? null);
  readonly tituloARechazar = computed(() => this.tituloDe(this.idARechazar()));

  /** Qué falta en una publicación que no se pudo aprobar; undefined si no hay aviso. */
  avisoDe(idPublicacion: number): AvisoAprobacion | undefined {
    return this.avisos()[idPublicacion];
  }

  /** Carga una página (la 0 por defecto). Una petición nueva cancela la anterior. */
  cargar(pagina = 0): void {
    this.peticion?.unsubscribe();
    this.state.update((actual) => ({ ...actual, estado: 'cargando', paginaSolicitada: pagina }));

    this.peticion = this.repository
      .listarPendientes(pagina, TAMANO_PAGINA)
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

  aprobar(idPublicacion: number): void {
    if (this.ocupado()) {
      return;
    }
    const titulo = this.tituloDe(idPublicacion);
    const nombre = titulo ? `«${titulo}»` : 'la publicación';
    const mensaje = `¿Aprobar ${nombre}? Pasará a ACTIVA y quedará disponible en la plataforma.`;
    if (!this.confirmacion.confirmar(mensaje)) {
      return;
    }
    this.enCurso.set({ id: idPublicacion, accion: 'aprobar' });
    this.quitarAviso(idPublicacion);

    this.repository
      .aprobar(idPublicacion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enCurso.set(null);
          this.toast.success('Publicación aprobada', 'Ya está activa.');
          this.recargar();
        },
        error: (error: unknown) => this.alFallarAprobacion(idPublicacion, error),
      });
  }

  /** Abre el cuadro para escribir el motivo del rechazo. */
  iniciarRechazo(idPublicacion: number): void {
    if (!this.ocupado()) {
      this.rechazo.set({ id: idPublicacion, error: null });
    }
  }

  cancelarRechazo(): void {
    if (this.accionEnCurso() !== 'rechazar') {
      this.rechazo.set(null);
    }
  }

  confirmarRechazo(motivo: string): void {
    const rechazo = this.rechazo();
    if (rechazo === null || this.ocupado()) {
      return;
    }
    this.enCurso.set({ id: rechazo.id, accion: 'rechazar' });
    this.rechazo.set({ id: rechazo.id, error: null });

    this.repository
      .rechazar(rechazo.id, motivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enCurso.set(null);
          this.rechazo.set(null);
          this.toast.success(
            'Publicación rechazada',
            'Volvió a borrador para que el Anfitrión la corrija.',
          );
          this.recargar();
        },
        error: (error: unknown) => this.alFallarRechazo(rechazo.id, error),
      });
  }

  private alFallarAprobacion(idPublicacion: number, error: unknown): void {
    this.enCurso.set(null);

    if (error instanceof InformacionMinimaIncompletaError) {
      const pendientes = Object.entries(error.pendientes).map(([campo, mensaje]) => ({
        campo,
        mensaje,
      }));
      this.avisos.update((actuales) => ({
        ...actuales,
        [idPublicacion]: { mensaje: error.message, pendientes },
      }));
    } else if (
      error instanceof TransicionNoPermitidaError ||
      error instanceof PublicacionNoEncontradaError
    ) {
      this.toast.error('No se pudo aprobar', error.message);
      this.recargar();
    } else {
      this.toast.error('No se pudo aprobar', this.mensajeDe(error));
    }
  }

  private alFallarRechazo(idPublicacion: number, error: unknown): void {
    this.enCurso.set(null);

    if (error instanceof MotivoInvalidoError) {
      this.rechazo.set({ id: idPublicacion, error: error.message });
    } else if (
      error instanceof TransicionNoPermitidaError ||
      error instanceof PublicacionNoEncontradaError
    ) {
      this.rechazo.set(null);
      this.toast.error('No se pudo rechazar', error.message);
      this.recargar();
    } else {
      this.rechazo.set({ id: idPublicacion, error: this.mensajeDe(error) });
    }
  }

  private alCargar(resultado: Pagina<Publicacion>, pagina: number): void {
    // Página fuera de rango (p. ej. se vació la última): se muestra la última que sí existe.
    const ultima = resultado.totalPaginas - 1;
    if (resultado.contenido.length === 0 && resultado.totalElementos > 0 && pagina > ultima) {
      this.cargar(Math.max(ultima, 0));
      return;
    }
    this.state.set({ estado: 'listo', paginaSolicitada: pagina, resultado });
  }

  /** Vuelve a pedir la página que se estaba viendo. */
  private recargar(): void {
    this.cargar(this.paginaActual());
  }

  private tituloDe(idPublicacion: number | null): string | null {
    return (
      this.publicaciones().find((publicacion) => publicacion.idPublicacion === idPublicacion)
        ?.titulo ?? null
    );
  }

  private quitarAviso(idPublicacion: number): void {
    this.avisos.update((actuales) =>
      Object.fromEntries(
        Object.entries(actuales).filter(([clave]) => Number(clave) !== idPublicacion),
      ),
    );
  }

  private mensajeDe(error: unknown): string {
    return error instanceof ApiError ? error.message : MENSAJE_GENERICO;
  }
}
