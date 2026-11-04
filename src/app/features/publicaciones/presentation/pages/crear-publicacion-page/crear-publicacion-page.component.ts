import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CrearPublicacionFacade } from '../../../application/crear-publicacion.facade';
import { CrearPublicacionFormComponent } from '../../components/crear-publicacion-form/crear-publicacion-form.component';
import { PublicacionConfirmacionComponent } from '../../components/publicacion-confirmacion/publicacion-confirmacion.component';

/**
 * Componente contenedor (smart): conecta la vista con el facade. Carga los catálogos al abrir
 * y, una vez guardada la publicación, reemplaza el formulario por su ficha de confirmación.
 */
@Component({
  selector: 'app-crear-publicacion-page',
  imports: [CrearPublicacionFormComponent, PublicacionConfirmacionComponent, RouterLink],
  providers: [CrearPublicacionFacade],
  templateUrl: './crear-publicacion-page.component.html',
  styleUrl: './crear-publicacion-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearPublicacionPageComponent {
  protected readonly facade = inject(CrearPublicacionFacade);

  constructor() {
    this.facade.cargarCatalogos();
  }
}
