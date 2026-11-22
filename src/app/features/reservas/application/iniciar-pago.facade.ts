import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RedireccionExterna } from '@core/navigation/redireccion-externa.service';
import { Subscription } from 'rxjs';
import { Pago } from '../domain/models/pago';
import { PagoRepository } from '../domain/repositories/pago.repository';
import {
  clasificarErrorPago,
  ErrorPago,
  MENSAJE_RESERVA_INEXISTENTE,
  MENSAJE_SIN_PAGINA_DE_PAGO,
} from './errores-pago';

export type EstadoIniciarPago =
  /** Todavía no se ha pedido iniciar el pago. */
  | 'inicial'
  | 'iniciando'
  /** Hay una sesión de pago: se muestra el monto y se puede continuar a la página de pago. */
  | 'listo'
  | 'error';

interface IniciarPagoState {
  estado: EstadoIniciarPago;
  pago: Pago | null;
  error: ErrorPago | null;
}

const INICIAL: IniciarPagoState = { estado: 'inicial', pago: null, error: null };

/**
 * Inicia el pago de una reserva: pide la sesión de pago al backend (`POST`), muestra el monto y,
 * cuando la persona continúa, la lleva a la página de pago. El front no envía ningún monto ni
 * ve datos de tarjeta; el resultado se consulta después en la pantalla de resultado.
 */
@Injectable()
export class IniciarPagoFacade {
  private readonly repository = inject(PagoRepository);
  private readonly redireccion = inject(RedireccionExterna);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<IniciarPagoState>(INICIAL);
  private peticion?: Subscription;

  readonly estado = computed(() => this.state().estado);
  readonly pago = computed(() => this.state().pago);
  readonly error = computed(() => this.state().error);

  /** Con `null` (identificador inválido) no se consulta: la reserva no puede existir. */
  iniciar(idReserva: number | null): void {
    if (this.estado() === 'iniciando') {
      return;
    }
    if (idReserva === null) {
      this.state.set({
        estado: 'error',
        pago: null,
        error: { tipo: 'no-encontrada', mensaje: MENSAJE_RESERVA_INEXISTENTE },
      });
      return;
    }

    this.peticion?.unsubscribe();
    this.state.set({ estado: 'iniciando', pago: null, error: null });

    this.peticion = this.repository
      .iniciar(idReserva)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pago) => this.state.set({ estado: 'listo', pago, error: null }),
        error: (error: unknown) =>
          this.state.set({ estado: 'error', pago: null, error: clasificarErrorPago(error) }),
      });
  }

  /** Lleva a la persona a la página de pago. Si la dirección no sirve, lo informa. */
  continuar(): void {
    if (!this.redireccion.ir(this.pago()?.urlPago)) {
      this.state.update((actual) => ({
        ...actual,
        estado: 'error',
        error: { tipo: 'otro', mensaje: MENSAJE_SIN_PAGINA_DE_PAGO },
      }));
    }
  }

  /** Vuelve al comienzo para poder pedir el pago de nuevo. */
  reiniciar(): void {
    this.peticion?.unsubscribe();
    this.state.set(INICIAL);
  }
}
