import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Cotizacion } from '../../../domain/models/cotizacion';

/**
 * Desglose de una cotización, en este orden: noches × precio por noche = precio base, descuento
 * (solo si lo hay), limpieza, servicios adicionales (solo si se eligieron), tarifa de servicio y
 * total. Muestra los valores tal como los calculó el backend, sin recalcular nada.
 */
@Component({
  selector: 'app-desglose-cotizacion',
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './desglose-cotizacion.component.html',
  styleUrl: './desglose-cotizacion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesgloseCotizacionComponent {
  readonly cotizacion = input.required<Cotizacion>();
}
