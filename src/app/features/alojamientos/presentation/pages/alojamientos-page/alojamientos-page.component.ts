import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatearPesos } from '@features/publicaciones/application/moneda';
import { IconoAlojamientoComponent } from '@shared/ui/icono-alojamiento/icono-alojamiento.component';
import { AlojamientosFacade } from '../../../application/alojamientos.facade';

/**
 * Componente contenedor (smart) del listado de alojamientos disponibles: lo ven los Visitantes
 * (`/alojamientos`, sin sesión) y los Huéspedes (`/marketplace`). Muestra, de a una página, solo
 * lo que el backend deja ver: título, ciudad, tipo, capacidad y precio por noche. No hay acciones
 * de gestión ni detalle. El facade vive y muere con la página.
 */
@Component({
  selector: 'app-alojamientos-page',
  imports: [RouterLink, IconoAlojamientoComponent],
  providers: [AlojamientosFacade],
  templateUrl: './alojamientos-page.component.html',
  styleUrl: './alojamientos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlojamientosPageComponent {
  protected readonly facade = inject(AlojamientosFacade);
  protected readonly pesos = formatearPesos;

  constructor() {
    this.facade.cargar(0);
  }

  protected textoCapacidad(capacidad: number): string {
    return `${capacidad} ${capacidad === 1 ? 'huésped' : 'huéspedes'}`;
  }
}
