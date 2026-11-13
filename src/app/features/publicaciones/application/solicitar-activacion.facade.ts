import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/http/api-error';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import { Observable, Subject } from 'rxjs';
import {
  InformacionMinimaIncompletaError,
  PublicacionAjenaError,
  PublicacionNoEncontradaError,
  TransicionNoPermitidaError,
} from '../domain/errors/publicacion.errors';
import { PendientesActivacion } from '../domain/models/publicacion';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';

/**
 * Cómo terminó una solicitud, para que la página decida si recarga sus datos:
 * - `enviada`: la publicación pasó a PENDIENTE_REVISION.
 * - `incompleta`: falta información (400); nada cambió y se muestran los pendientes.
 * - `rechazada`: 409, 403 o 404; el estado real es otro, así que conviene recargar.
 * - `fallida`: error de red o del servidor; nada cambió.
 */
export type ResultadoSolicitud = 'enviada' | 'incompleta' | 'rechazada' | 'fallida';

/** Un campo pendiente con el mensaje del backend, listo para mostrarlo. */
export interface PendienteActivacion {
  campo: string;
  mensaje: string;
}

const CONFIRMACION =
  '¿Enviar la publicación a revisión? El Administrador la revisará antes de activarla.';
const MENSAJE_GENERICO = 'No fue posible enviar la publicación a revisión. Inténtalo de nuevo.';

/**
 * Facade / caso de uso "Solicitar la activación de una publicación" (Anfitrión). Lo comparten el
 * listado "Mis publicaciones" y el detalle: cada página lo provee, escucha `resultado$` y
 * recarga lo que necesite.
 * - Pide confirmación antes de enviar; si la persona cancela, no se llama al servidor.
 * - 400: guarda los campos pendientes en `pendientes` (la publicación no cambia).
 * - 409, 403 y 404: avisa con el mensaje del backend.
 * - 401: lo resuelve el interceptor (cierra sesión y lleva al login).
 */
@Injectable()
export class SolicitarActivacionFacade {
  private readonly repository = inject(PublicacionRepository);
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly enCurso = signal<number | null>(null);
  private readonly datosPendientes = signal<{
    idPublicacion: number;
    pendientes: PendientesActivacion;
  } | null>(null);
  private readonly resultados = new Subject<ResultadoSolicitud>();

  /** Hay un envío en curso. */
  readonly enviando = computed(() => this.enCurso() !== null);
  /** Publicación que se está enviando, para marcar solo su botón. */
  readonly idEnviando = this.enCurso.asReadonly();
  /** Campos que faltan en el último intento, en el orden del formulario; vacío si no hay. */
  readonly pendientes = computed<PendienteActivacion[]>(() =>
    Object.entries(this.datosPendientes()?.pendientes ?? {}).map(([campo, mensaje]) => ({
      campo,
      mensaje,
    })),
  );
  /** Publicación a la que pertenecen los pendientes. */
  readonly idPendientes = computed(() => this.datosPendientes()?.idPublicacion ?? null);
  readonly resultado$: Observable<ResultadoSolicitud> = this.resultados.asObservable();

  solicitar(idPublicacion: number): void {
    if (this.enviando() || !this.confirmacion.confirmar(CONFIRMACION)) {
      return;
    }
    this.enCurso.set(idPublicacion);
    this.datosPendientes.set(null);

    this.repository
      .solicitarActivacion(idPublicacion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enCurso.set(null);
          this.toast.success('Publicación enviada a revisión');
          this.resultados.next('enviada');
        },
        error: (error: unknown) => this.alFallar(idPublicacion, error),
      });
  }

  /** Quita el panel de pendientes (por ejemplo al cerrarlo). */
  limpiarPendientes(): void {
    this.datosPendientes.set(null);
  }

  private alFallar(idPublicacion: number, error: unknown): void {
    this.enCurso.set(null);

    if (error instanceof InformacionMinimaIncompletaError) {
      this.datosPendientes.set({ idPublicacion, pendientes: error.pendientes });
      this.resultados.next('incompleta');
    } else if (
      error instanceof TransicionNoPermitidaError ||
      error instanceof PublicacionAjenaError ||
      error instanceof PublicacionNoEncontradaError
    ) {
      this.toast.error('No se pudo enviar a revisión', error.message);
      this.resultados.next('rechazada');
    } else {
      const mensaje = error instanceof ApiError ? error.message : MENSAJE_GENERICO;
      this.toast.error('No se pudo enviar a revisión', mensaje);
      this.resultados.next('fallida');
    }
  }
}
