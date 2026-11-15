import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/http/api-error';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import { Observable, Subject } from 'rxjs';
import {
  PublicacionAjenaError,
  PublicacionNoEncontradaError,
  TransicionNoPermitidaError,
} from '../domain/errors/publicacion.errors';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';

/**
 * Cómo terminó el intento, para que la página decida si recarga sus datos:
 * - `pausada`: la publicación pasó a PAUSADA.
 * - `rechazada`: 409, 403 o 404; el estado real es otro, así que conviene recargar.
 * - `fallida`: error de red o del servidor; nada cambió.
 */
export type ResultadoPausa = 'pausada' | 'rechazada' | 'fallida';

const CONFIRMACION =
  '¿Pausar la publicación? Dejará de aparecer en las búsquedas. Podrás editarla mientras esté pausada y el Administrador la revisará para reactivarla.';
const MENSAJE_GENERICO = 'No fue posible pausar la publicación. Inténtalo de nuevo.';

/**
 * Facade / caso de uso "Pausar una publicación activa" (Anfitrión). Lo comparten el listado
 * "Mis publicaciones" y el detalle: cada página lo provee, escucha `resultado$` y recarga lo que
 * necesite.
 * - Pide confirmación antes de pausar; si la persona cancela, no se llama al servidor.
 * - 409, 403 y 404: avisa con el mensaje del backend.
 * - 401: lo resuelve el interceptor (cierra sesión y lleva al login).
 */
@Injectable()
export class PausarPublicacionFacade {
  private readonly repository = inject(PublicacionRepository);
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly enCurso = signal<number | null>(null);
  private readonly resultados = new Subject<ResultadoPausa>();

  /** Hay una pausa en curso. */
  readonly pausando = computed(() => this.enCurso() !== null);
  /** Publicación que se está pausando, para marcar solo su botón. */
  readonly idPausando = this.enCurso.asReadonly();
  readonly resultado$: Observable<ResultadoPausa> = this.resultados.asObservable();

  pausar(idPublicacion: number): void {
    if (this.pausando() || !this.confirmacion.confirmar(CONFIRMACION)) {
      return;
    }
    this.enCurso.set(idPublicacion);

    this.repository
      .pausar(idPublicacion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enCurso.set(null);
          this.toast.success('Publicación pausada');
          this.resultados.next('pausada');
        },
        error: (error: unknown) => this.alFallar(error),
      });
  }

  private alFallar(error: unknown): void {
    this.enCurso.set(null);

    if (
      error instanceof TransicionNoPermitidaError ||
      error instanceof PublicacionAjenaError ||
      error instanceof PublicacionNoEncontradaError
    ) {
      this.toast.error('No se pudo pausar', error.message);
      this.resultados.next('rechazada');
    } else {
      const mensaje = error instanceof ApiError ? error.message : MENSAJE_GENERICO;
      this.toast.error('No se pudo pausar', mensaje);
      this.resultados.next('fallida');
    }
  }
}
