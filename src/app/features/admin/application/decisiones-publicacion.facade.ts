import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/http/api-error';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import {
  InformacionMinimaIncompletaError,
  PublicacionNoEncontradaError,
  TransicionNoPermitidaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import { Publicacion } from '@features/publicaciones/domain/models/publicacion';
import { Observable, Subject } from 'rxjs';
import { MotivoInvalidoError } from '../domain/errors/revision.errors';
import { PublicacionAdminRepository } from '../domain/repositories/publicacion-admin.repository';

/** Acciones que piden un motivo en el cuadro de diálogo. */
export type AccionConMotivo = 'rechazar' | 'bloquear' | 'reactivar';
export type AccionDecision = 'aprobar' | AccionConMotivo;

/**
 * Cómo terminó una decisión, para que la página decida si recarga sus datos:
 * - `hecha`: la acción se ejecutó.
 * - `desactualizada`: 404 o 409; el estado real es otro, así que conviene recargar.
 * - `incompleta`: falta información mínima (400); nada cambió y el aviso queda en la fila.
 * - `fallida`: error de red o del servidor; nada cambió.
 */
export type ResultadoDecision = 'hecha' | 'desactualizada' | 'incompleta' | 'fallida';

/** Lo que falta en una publicación que no se pudo activar, para mostrarlo en su tarjeta. */
export interface AvisoInformacionMinima {
  mensaje: string;
  pendientes: { campo: string; mensaje: string }[];
}

interface Textos {
  /** Aviso de éxito: título y detalle. */
  exito: [string, string];
  /** Título del aviso de error. */
  fallo: string;
}

const TEXTOS: Record<AccionDecision, Textos> = {
  aprobar: { exito: ['Publicación aprobada', 'Ya está activa.'], fallo: 'No se pudo aprobar' },
  rechazar: {
    exito: ['Publicación rechazada', 'Volvió a borrador para que el Anfitrión la corrija.'],
    fallo: 'No se pudo rechazar',
  },
  bloquear: {
    exito: ['Publicación bloqueada', 'Dejó de ofrecerse y el Anfitrión verá el motivo.'],
    fallo: 'No se pudo bloquear',
  },
  reactivar: {
    exito: ['Publicación reactivada', 'Ya está activa.'],
    fallo: 'No se pudo reactivar',
  },
};

const MENSAJE_GENERICO = 'Inténtalo de nuevo en unos minutos.';

interface Dialogo {
  id: number;
  accion: AccionConMotivo;
  error: string | null;
}

/**
 * Facade / caso de uso "Decidir sobre una publicación" (Administrador): aprobar, rechazar,
 * bloquear y reactivar. La comparten la gestión de publicaciones y el detalle del Administrador;
 * cada página la provee, escucha `resultado$` y recarga lo que necesite.
 * - Aprobar pide confirmación. Rechazar, bloquear y reactivar abren el cuadro del motivo.
 * - 400 por información mínima: deja los campos pendientes en la fila, sin sacarla ni recargar.
 * - 400 por el motivo: deja el error dentro del cuadro, que sigue abierto.
 * - 404 y 409: cierra el cuadro, avisa con el mensaje del backend y pide recargar.
 * - 401 y 403: los resuelve el interceptor.
 */
@Injectable()
export class DecisionesPublicacionFacade {
  private readonly repository = inject(PublicacionAdminRepository);
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly enCurso = signal<{ id: number; accion: AccionDecision } | null>(null);
  private readonly avisos = signal<Record<number, AvisoInformacionMinima>>({});
  private readonly dialogo = signal<Dialogo | null>(null);
  private readonly resultados = new Subject<ResultadoDecision>();

  /** Hay una decisión en curso: los demás botones esperan. */
  readonly ocupado = computed(() => this.enCurso() !== null);
  readonly idEnCurso = computed(() => this.enCurso()?.id ?? null);
  readonly accionEnCurso = computed(() => this.enCurso()?.accion ?? null);
  /** Publicación sobre la que está abierto el cuadro del motivo; null si está cerrado. */
  readonly idDelDialogo = computed(() => this.dialogo()?.id ?? null);
  readonly accionDelDialogo = computed(() => this.dialogo()?.accion ?? null);
  readonly errorMotivo = computed(() => this.dialogo()?.error ?? null);
  readonly resultado$: Observable<ResultadoDecision> = this.resultados.asObservable();

  /** Qué falta en una publicación que no se pudo activar; undefined si no hay aviso. */
  avisoDe(idPublicacion: number): AvisoInformacionMinima | undefined {
    return this.avisos()[idPublicacion];
  }

  aprobar(idPublicacion: number, titulo: string | null): void {
    if (this.ocupado()) {
      return;
    }
    const nombre = titulo ? `«${titulo}»` : 'la publicación';
    const mensaje = `¿Aprobar ${nombre}? Pasará a ACTIVA y quedará disponible en la plataforma.`;
    if (!this.confirmacion.confirmar(mensaje)) {
      return;
    }
    this.ejecutar(idPublicacion, 'aprobar', this.repository.aprobar(idPublicacion));
  }

  /** Abre el cuadro para escribir el motivo de rechazar, bloquear o reactivar. */
  iniciarMotivo(idPublicacion: number, accion: AccionConMotivo): void {
    if (!this.ocupado()) {
      this.dialogo.set({ id: idPublicacion, accion, error: null });
    }
  }

  cancelarMotivo(): void {
    if (!this.ocupado()) {
      this.dialogo.set(null);
    }
  }

  confirmarMotivo(motivo: string): void {
    const dialogo = this.dialogo();
    if (dialogo === null || this.ocupado()) {
      return;
    }
    this.dialogo.set({ ...dialogo, error: null });
    this.ejecutar(dialogo.id, dialogo.accion, this.repository[dialogo.accion](dialogo.id, motivo));
  }

  private ejecutar(
    idPublicacion: number,
    accion: AccionDecision,
    peticion: Observable<Publicacion>,
  ): void {
    this.enCurso.set({ id: idPublicacion, accion });
    this.quitarAviso(idPublicacion);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.enCurso.set(null);
        this.dialogo.set(null);
        const [titulo, detalle] = TEXTOS[accion].exito;
        this.toast.success(titulo, detalle);
        this.resultados.next('hecha');
      },
      error: (error: unknown) => this.alFallar(idPublicacion, accion, error),
    });
  }

  private alFallar(idPublicacion: number, accion: AccionDecision, error: unknown): void {
    this.enCurso.set(null);
    const conMotivo = accion !== 'aprobar';

    if (error instanceof MotivoInvalidoError && conMotivo) {
      this.dialogo.set({ id: idPublicacion, accion, error: error.message });
    } else if (error instanceof InformacionMinimaIncompletaError) {
      this.dialogo.set(null);
      const pendientes = Object.entries(error.pendientes).map(([campo, mensaje]) => ({
        campo,
        mensaje,
      }));
      this.avisos.update((actuales) => ({
        ...actuales,
        [idPublicacion]: { mensaje: error.message, pendientes },
      }));
      this.resultados.next('incompleta');
    } else if (
      error instanceof TransicionNoPermitidaError ||
      error instanceof PublicacionNoEncontradaError
    ) {
      this.dialogo.set(null);
      this.toast.error(TEXTOS[accion].fallo, error.message);
      this.resultados.next('desactualizada');
    } else if (conMotivo) {
      // Red o servidor: el cuadro sigue abierto con el mensaje para reintentar.
      this.dialogo.set({ id: idPublicacion, accion, error: this.mensajeDe(error) });
      this.resultados.next('fallida');
    } else {
      this.toast.error(TEXTOS[accion].fallo, this.mensajeDe(error));
      this.resultados.next('fallida');
    }
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
