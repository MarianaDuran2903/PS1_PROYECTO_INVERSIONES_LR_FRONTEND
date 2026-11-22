import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ErrorPago, TipoErrorPago } from '../../../application/errores-pago';

const TITULOS: Record<TipoErrorPago, string> = {
  'ya-pagada': 'Tu reserva ya está confirmada',
  'no-admite-pago': 'La reserva venció',
  'intentos-agotados': 'Se agotaron los intentos de pago',
  pasarela: 'No pudimos iniciar el pago',
  'monto-minimo': 'El total no alcanza el pago mínimo',
  'no-encontrada': 'No encontramos la reserva',
  'sin-pago': 'Esta reserva aún no tiene un pago',
  'sin-permiso': 'Sin permisos sobre esta reserva',
  otro: 'No se pudo completar la operación',
};

/**
 * Explica un fallo del pago y ofrece lo que corresponde: reintentar cuando es pasajero (la
 * pasarela no respondió), pagar si aún no hay pago, o volver a reservar cuando la reserva ya no
 * admite pago. Como todavía no hay lista de reservas, "volver" lleva a explorar alojamientos.
 */
@Component({
  selector: 'app-error-pago',
  imports: [RouterLink],
  templateUrl: './error-pago.component.html',
  styleUrl: './error-pago.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorPagoComponent {
  readonly error = input.required<ErrorPago>();
  /** Reserva a la que se refiere el error, para ofrecer "Pagar mi reserva". */
  readonly idReserva = input<number | null>(null);
  /** Se está reintentando: el botón queda deshabilitado. */
  readonly reintentando = input(false);
  readonly reintentar = output<void>();

  protected readonly titulo = computed(() => TITULOS[this.error().tipo]);
  /** Ya pagada no es un fallo: se anuncia como estado y no como alerta. */
  protected readonly esExito = computed(() => this.error().tipo === 'ya-pagada');
  protected readonly sePuedeReintentar = computed(
    () => this.error().tipo === 'pasarela' || this.error().tipo === 'otro',
  );
  protected readonly debeReservarDeNuevo = computed(
    () =>
      this.error().tipo === 'no-admite-pago' ||
      this.error().tipo === 'intentos-agotados' ||
      this.error().tipo === 'monto-minimo',
  );
}
