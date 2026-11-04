import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconoAlojamientoComponent } from '@shared/ui/icono-alojamiento/icono-alojamiento.component';
import { MisPublicacionesFacade } from '../../../application/mis-publicaciones.facade';
import { formatearPesos } from '../../../application/moneda';
import { BotonEditarPublicacionComponent } from '../../components/boton-editar-publicacion/boton-editar-publicacion.component';
import { EstadoPublicacionComponent } from '../../components/estado-publicacion/estado-publicacion.component';

/**
 * Componente contenedor (smart) de "Mis publicaciones": lista, de a una página, los alojamientos
 * del Anfitrión autenticado con su estado vigente. El facade vive y muere con la página.
 */
@Component({
  selector: 'app-mis-publicaciones-page',
  imports: [
    RouterLink,
    IconoAlojamientoComponent,
    EstadoPublicacionComponent,
    BotonEditarPublicacionComponent,
  ],
  providers: [MisPublicacionesFacade],
  templateUrl: './mis-publicaciones-page.component.html',
  styleUrl: './mis-publicaciones-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisPublicacionesPageComponent {
  protected readonly facade = inject(MisPublicacionesFacade);
  protected readonly pesos = formatearPesos;

  constructor() {
    this.facade.cargar(0);
  }

  protected textoCapacidad(capacidad: number): string {
    return `${capacidad} ${capacidad === 1 ? 'huésped' : 'huéspedes'}`;
  }
}
