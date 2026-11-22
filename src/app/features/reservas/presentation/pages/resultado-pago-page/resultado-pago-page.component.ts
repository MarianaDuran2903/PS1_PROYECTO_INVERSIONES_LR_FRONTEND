import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { idReservaValido } from '../../../application/id-reserva';
import { ResultadoPagoFacade } from '../../../application/resultado-pago.facade';
import { ErrorPagoComponent } from '../../components/error-pago/error-pago.component';

/** Motivo que se muestra si el backend rechazó el pago sin explicar por qué. */
const MOTIVO_POR_DEFECTO = 'No se pudo procesar el pago con esa tarjeta.';

/**
 * Resultado del pago de una reserva (`/reservas/:idReserva/pago/resultado`), adonde regresa la
 * pasarela, con `?cancelado=true` si la persona volvió sin pagar. Siempre consulta el backend:
 * volver aquí NO significa que el pago se haya aprobado.
 */
@Component({
  selector: 'app-resultado-pago-page',
  imports: [CurrencyPipe, RouterLink, ErrorPagoComponent],
  providers: [ResultadoPagoFacade],
  templateUrl: './resultado-pago-page.component.html',
  styleUrl: './resultado-pago-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadoPagoPageComponent {
  protected readonly facade = inject(ResultadoPagoFacade);

  /** Parámetro de la ruta y parámetro de consulta, enlazados por `withComponentInputBinding`. */
  readonly idReserva = input<string>();
  readonly cancelado = input<string>();

  protected readonly id = computed(() => idReservaValido(this.idReserva()));
  protected readonly motivoRechazo = computed(
    () => this.facade.pago()?.motivoRechazo || MOTIVO_POR_DEFECTO,
  );

  constructor() {
    effect(() => {
      const id = this.id();
      const cancelado = this.cancelado() === 'true';
      untracked(() => this.facade.cargar(id, cancelado));
    });
  }
}
