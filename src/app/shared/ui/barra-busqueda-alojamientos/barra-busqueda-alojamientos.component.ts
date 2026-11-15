import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-barra-busqueda-alojamientos',
  templateUrl: './barra-busqueda-alojamientos.component.html',
  styleUrl: './barra-busqueda-alojamientos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraBusquedaAlojamientosComponent {
  readonly cargando = input(false);
  readonly buscar = output<void>();
}
