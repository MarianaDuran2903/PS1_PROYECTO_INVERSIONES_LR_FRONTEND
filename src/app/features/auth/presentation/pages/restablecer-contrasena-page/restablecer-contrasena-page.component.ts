import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { RestablecerContrasenaFacade } from '../../../application/restablecer-contrasena.facade';
import {
  DatosRestablecimiento,
  RestablecerContrasenaFormComponent,
} from '../../components/restablecer-contrasena-form/restablecer-contrasena-form.component';

/**
 * Contenedor (smart) para fijar la nueva contraseña (RF-USR-004). El código llega en
 * `?token=...`: se guarda solo en memoria de este componente y se quita de la URL para que no
 * quede en el historial del navegador.
 */
@Component({
  selector: 'app-restablecer-contrasena-page',
  imports: [RestablecerContrasenaFormComponent, RouterLink],
  providers: [RestablecerContrasenaFacade],
  templateUrl: './restablecer-contrasena-page.component.html',
  styleUrl: './restablecer-contrasena-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestablecerContrasenaPageComponent {
  protected readonly facade = inject(RestablecerContrasenaFacade);
  protected readonly esDesarrollo = !inject(APP_CONFIG).production;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Código tomado de la URL; null si no vino y hay que pegarlo. Nunca se persiste. */
  private readonly tokenUrl = signal<string | null>(null);
  protected readonly pedirToken = signal(false);

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    if (token.length > 0) {
      this.tokenUrl.set(token);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { token: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    } else {
      this.pedirToken.set(true);
    }
  }

  protected restablecer(datos: DatosRestablecimiento): void {
    const token = datos.token ?? this.tokenUrl() ?? '';
    this.facade.restablecer({
      token,
      contrasena: datos.contrasena,
      confirmarContrasena: datos.confirmarContrasena,
    });
  }
}
