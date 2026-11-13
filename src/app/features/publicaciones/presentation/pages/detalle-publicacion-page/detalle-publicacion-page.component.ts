import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DetallePublicacionFacade } from '../../../application/detalle-publicacion.facade';
import { PausarPublicacionFacade } from '../../../application/pausar-publicacion.facade';
import { SolicitarActivacionFacade } from '../../../application/solicitar-activacion.facade';
import { PendientesActivacionComponent } from '../../components/pendientes-activacion/pendientes-activacion.component';
import { PublicacionConfirmacionComponent } from '../../components/publicacion-confirmacion/publicacion-confirmacion.component';

/**
 * Componente contenedor (smart) del detalle de una publicación propia. El id llega como
 * parámetro de la ruta (`/anfitrion/publicaciones/:id`, enlazado por `withComponentInputBinding`).
 * Reutiliza la ficha de la publicación en su modo `detalle` y permite enviar un borrador a
 * revisión o pausar una publicación activa: después de la acción, o si el estado real era otro,
 * vuelve a cargar la publicación.
 */
@Component({
  selector: 'app-detalle-publicacion-page',
  imports: [PublicacionConfirmacionComponent, PendientesActivacionComponent],
  providers: [DetallePublicacionFacade, SolicitarActivacionFacade, PausarPublicacionFacade],
  templateUrl: './detalle-publicacion-page.component.html',
  styleUrl: './detalle-publicacion-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetallePublicacionPageComponent {
  protected readonly facade = inject(DetallePublicacionFacade);
  protected readonly activacion = inject(SolicitarActivacionFacade);
  protected readonly pausa = inject(PausarPublicacionFacade);

  readonly id = input<string>();

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.facade.cargar(id));
    });

    this.activacion.resultado$.pipe(takeUntilDestroyed()).subscribe((resultado) => {
      if (resultado === 'enviada' || resultado === 'rechazada') {
        this.facade.cargar(this.id());
      }
    });
    // Igual al pausar: se vuelve a cargar la publicación para ver su estado real.
    this.pausa.resultado$.pipe(takeUntilDestroyed()).subscribe((resultado) => {
      if (resultado === 'pausada' || resultado === 'rechazada') {
        this.facade.cargar(this.id());
      }
    });
  }

  protected reintentar(): void {
    this.facade.cargar(this.id());
  }

  protected pausar(idPublicacion: number): void {
    this.pausa.pausar(idPublicacion);
  }

  protected enviarARevision(idPublicacion: number): void {
    this.activacion.solicitar(idPublicacion);
  }
}
