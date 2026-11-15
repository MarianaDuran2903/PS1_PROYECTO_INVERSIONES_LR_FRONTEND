import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BusquedaAlojamientosFacade } from '../../../application/busqueda-alojamientos.facade';
import { BarraBusquedaAlojamientosComponent } from '@shared/ui/barra-busqueda-alojamientos/barra-busqueda-alojamientos.component';
import { FiltrosBusquedaAlojamientos } from '@features/marketplace/domain/models/busqueda-alojamientos';
import { ActivatedRoute } from '@angular/router';

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

  private readonly route = inject(ActivatedRoute);

  constructor() {
    this.facade.cargar(0, this.filtrosDesdeQueryParams());
    this.facade.cargarCiudades();
  }

  protected buscar(filtros: FiltrosBusquedaAlojamientos): void {
    this.facade.cargar(0, filtros);
  }

  protected limpiar(): void {
    this.facade.cargar(0, {});
  }

  private filtrosDesdeQueryParams(): FiltrosBusquedaAlojamientos | undefined {
    const params = this.route.snapshot.queryParamMap;
    const idCiudad = params.get('idCiudad');
    const fechaLlegada = params.get('fechaLlegada');
    const fechaSalida = params.get('fechaSalida');
    const huespedes = params.get('huespedes');

    if (!idCiudad && !fechaLlegada && !fechaSalida && !huespedes) {
      return undefined;
    }

    return {
      idCiudad: idCiudad ? Number(idCiudad) : undefined,
      fechaLlegada: fechaLlegada ?? undefined,
      fechaSalida: fechaSalida ?? undefined,
      huespedes: huespedes ? Number(huespedes) : undefined,
    };
  }
}
