import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ReservarFacade } from '../../../application/reservar.facade';
import { SolicitudReserva } from '../../../domain/models/reserva';

/**
 * Botón «Reservar y pagar», que va justo debajo del desglose de una cotización. Reserva exactamente
 * lo que se cotizó (`solicitud`) y, cuando el backend crea la reserva, lleva a la pantalla de pago.
 * Si otra persona tomó las fechas entretanto avisa con `fechasOcupadas` para que quien lo usa
 * vuelva a cotizar.
 */
@Component({
  selector: 'app-accion-reservar',
  imports: [RouterLink],
  providers: [ReservarFacade],
  templateUrl: './accion-reservar.component.html',
  styleUrl: './accion-reservar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccionReservarComponent {
  protected readonly facade = inject(ReservarFacade);
  private readonly router = inject(Router);

  /** Lo que se cotizó y se va a reservar. */
  readonly solicitud = input.required<SolicitudReserva>();
  /** Alguna noche ya no está disponible: la cotización mostrada quedó desactualizada. */
  readonly fechasOcupadas = output<void>();

  /** Mensajes del servidor por campo, para mostrarlos como una lista. */
  protected readonly erroresPorCampo = computed(() =>
    Object.values(this.facade.error()?.errores ?? {}).filter((mensaje) => !!mensaje),
  );

  constructor() {
    this.facade.reservaCreada$
      .pipe(takeUntilDestroyed())
      .subscribe((reserva) => void this.router.navigate(['/reservas', reserva.idReserva, 'pago']));

    // Otros datos: el aviso anterior ya no corresponde.
    effect(() => {
      this.solicitud();
      untracked(() => this.facade.limpiar());
    });

    effect(() => {
      if (this.facade.error()?.tipo === 'fechas-no-disponibles') {
        untracked(() => this.fechasOcupadas.emit());
      }
    });
  }

  protected reservar(): void {
    this.facade.reservar(this.solicitud());
  }
}
