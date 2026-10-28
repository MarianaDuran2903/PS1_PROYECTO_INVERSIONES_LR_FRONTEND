import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RegistroUsuarioFacade } from '../../../application/registro-usuario.facade';
import { RolRegistrable, RolUsuario } from '../../../domain/models/rol-usuario';
import { RegistroFormComponent } from '../../components/registro-form/registro-form.component';

/**
 * Componente contenedor (smart): conecta la vista con el facade.
 * El facade se provee aquí para que su estado viva y muera con la página.
 */
@Component({
  selector: 'app-registro-page',
  imports: [RegistroFormComponent, RouterLink],
  providers: [RegistroUsuarioFacade],
  templateUrl: './registro-page.component.html',
  styleUrl: './registro-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroPageComponent {
  protected readonly facade = inject(RegistroUsuarioFacade);

  /** Query param `?rol=anfitrion` (enlazado por `withComponentInputBinding`). */
  readonly rol = input<string>();

  protected readonly rolInicial = computed<RolRegistrable>(() =>
    this.rol()?.toLowerCase() === 'anfitrion' ? RolUsuario.Anfitrion : RolUsuario.Huesped,
  );
}
