import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { RecuperarContrasenaFacade } from '../../../application/recuperar-contrasena.facade';
import { RecuperarContrasenaFormComponent } from '../../components/recuperar-contrasena-form/recuperar-contrasena-form.component';

/** Contenedor (smart) de la solicitud de recuperación de contraseña (RF-USR-004). */
@Component({
  selector: 'app-recuperar-contrasena-page',
  imports: [RecuperarContrasenaFormComponent, RouterLink],
  providers: [RecuperarContrasenaFacade],
  templateUrl: './recuperar-contrasena-page.component.html',
  styleUrl: './recuperar-contrasena-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarContrasenaPageComponent {
  protected readonly facade = inject(RecuperarContrasenaFacade);
  /** La nota del modo simulado solo se muestra fuera de producción. */
  protected readonly esDesarrollo = !inject(APP_CONFIG).production;
}
