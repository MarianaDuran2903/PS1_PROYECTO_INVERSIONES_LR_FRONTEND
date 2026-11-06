import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConCambiosSinGuardar } from '@features/publicaciones/application/cambios-sin-guardar.guard';
import { EstadoPublicacionComponent } from '@features/publicaciones/presentation/components/estado-publicacion/estado-publicacion.component';
import { PublicacionFormComponent } from '@features/publicaciones/presentation/components/publicacion-form/publicacion-form.component';
import { IntervenirPublicacionFacade } from '../../../application/intervenir-publicacion.facade';

/**
 * Componente contenedor (smart) de la intervención administrativa. El id llega como parámetro de
 * la ruta (`/admin/publicaciones/:id/editar`, enlazado por `withComponentInputBinding`). Reutiliza
 * el formulario de publicación en su modo `intervenir`, que añade el motivo obligatorio.
 */
@Component({
  selector: 'app-intervenir-publicacion-page',
  imports: [PublicacionFormComponent, EstadoPublicacionComponent, RouterLink],
  providers: [IntervenirPublicacionFacade],
  templateUrl: './intervenir-publicacion-page.component.html',
  styleUrl: './intervenir-publicacion-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntervenirPublicacionPageComponent implements ConCambiosSinGuardar {
  protected readonly facade = inject(IntervenirPublicacionFacade);
  private readonly router = inject(Router);
  private readonly formulario = viewChild(PublicacionFormComponent);

  readonly id = input<string>();

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.facade.cargar(id));
    });
  }

  /** Lo consulta `cambiosSinGuardarGuard` antes de salir de la pantalla. */
  hayCambiosSinGuardar(): boolean {
    // Tras guardar con éxito ya no hay nada pendiente, aunque el formulario aún no se repinte.
    return !this.facade.guardadoExitoso() && (this.formulario()?.hayCambios() ?? false);
  }

  protected reintentar(): void {
    this.facade.cargar(this.id());
  }

  /** Vuelve al panel de administración; si hay cambios sin guardar, el guard pide confirmación. */
  protected cancelar(): void {
    void this.router.navigate(['/admin']);
  }
}
