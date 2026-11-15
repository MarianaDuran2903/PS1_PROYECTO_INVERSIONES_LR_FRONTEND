import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BusquedaAlojamientosFacade } from '../../../application/busqueda-alojamientos.facade';
import { BarraBusquedaAlojamientosComponent } from '@shared/ui/barra-busqueda-alojamientos/barra-busqueda-alojamientos.component';

@Component({
  selector: 'app-busqueda-alojamientos-page',
  imports: [CurrencyPipe, BarraBusquedaAlojamientosComponent],
  providers: [BusquedaAlojamientosFacade],
  templateUrl: './busqueda-alojamientos-page.component.html',
  styleUrl: './busqueda-alojamientos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusquedaAlojamientosPageComponent {
  protected readonly facade = inject(BusquedaAlojamientosFacade);

  constructor() {
    this.facade.cargar();
  }
}
