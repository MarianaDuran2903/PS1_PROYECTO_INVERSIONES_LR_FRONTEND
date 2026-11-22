import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { idReservaValido } from '../../../application/id-reserva';
import { IniciarPagoFacade } from '../../../application/iniciar-pago.facade';
import { ErrorPagoComponent } from '../../components/error-pago/error-pago.component';
import { fechaLegible } from '../../formato-fecha';

/**
 * Pantalla para pagar una reserva (`/reservas/:idReserva/pago`). Pide la sesión de pago, muestra
 * el total que se cobrará y lleva a la página de pago de la pasarela (modo de pruebas, sin cobro
 * real). Esta aplicación nunca ve datos de tarjeta. El resultado se ve en
 * `/reservas/:idReserva/pago/resultado`, adonde regresa la pasarela.
 */
@Component({
  selector: 'app-pagar-reserva-page',
  imports: [CurrencyPipe, ErrorPagoComponent],
  providers: [IniciarPagoFacade],
  templateUrl: './pagar-reserva-page.component.html',
  styleUrl: './pagar-reserva-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagarReservaPageComponent {
  protected readonly facade = inject(IniciarPagoFacade);

  /** Parámetro de la ruta, enlazado por `withComponentInputBinding`. */
  readonly idReserva = input<string>();

  protected readonly id = computed(() => idReservaValido(this.idReserva()));
  protected readonly vence = computed(() => fechaLegible(this.facade.pago()?.fechaExpiracion));

  constructor() {
    // Otra reserva: se descarta lo anterior.
    effect(() => {
      this.idReserva();
      untracked(() => this.facade.reiniciar());
    });
  }

  protected pagar(): void {
    this.facade.iniciar(this.id());
  }
}
