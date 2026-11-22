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
import { ConCambiosSinGuardar } from '../../../application/cambios-sin-guardar.guard';
import { EditarPublicacionFacade } from '../../../application/editar-publicacion.facade';
import { EstadoPublicacionComponent } from '../../components/estado-publicacion/estado-publicacion.component';
import { PublicacionFormComponent } from '../../components/publicacion-form/publicacion-form.component';

/**
 * Componente contenedor (smart) de "Editar publicación". El id llega como parámetro de la ruta
 * (`/anfitrion/publicaciones/:id/editar`, enlazado por `withComponentInputBinding`). Carga la
 * publicación al abrir y, según su estado, muestra el formulario editable o en solo lectura.
 */
@Component({
  selector: 'app-editar-publicacion-page',
  imports: [PublicacionFormComponent, EstadoPublicacionComponent, RouterLink],
  providers: [EditarPublicacionFacade],
  templateUrl: './editar-publicacion-page.component.html',
  styleUrl: './editar-publicacion-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditarPublicacionPageComponent implements ConCambiosSinGuardar {
  protected readonly facade = inject(EditarPublicacionFacade);
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

  /** Vuelve al listado; si hay cambios sin guardar, el guard pide confirmación. */
  protected cancelar(): void {
    void this.router.navigate(['/anfitrion', 'publicaciones']);
  }
}
