import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { DetallePublicacionFacade } from '../../../application/detalle-publicacion.facade';
import { PublicacionConfirmacionComponent } from '../../components/publicacion-confirmacion/publicacion-confirmacion.component';

/**
 * Componente contenedor (smart) del detalle de una publicación propia. El id llega como
 * parámetro de la ruta (`/anfitrion/publicaciones/:id`, enlazado por `withComponentInputBinding`).
 * Reutiliza la ficha de la publicación en su modo `detalle`.
 */
@Component({
  selector: 'app-detalle-publicacion-page',
  imports: [PublicacionConfirmacionComponent],
  providers: [DetallePublicacionFacade],
  templateUrl: './detalle-publicacion-page.component.html',
  styleUrl: './detalle-publicacion-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetallePublicacionPageComponent {
  protected readonly facade = inject(DetallePublicacionFacade);

  readonly id = input<string>();

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.facade.cargar(id));
    });
  }

  protected reintentar(): void {
    this.facade.cargar(this.id());
  }
}
