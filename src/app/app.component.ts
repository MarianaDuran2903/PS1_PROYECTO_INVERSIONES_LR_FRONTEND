import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  IsActiveMatchOptions,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { ToastService } from '@core/notifications/toast.service';
import { SessionService } from '@features/auth/application/session.service';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { ToastContainerComponent } from '@shared/ui/toast-container/toast-container.component';

const SOLO_RUTA: IsActiveMatchOptions = {
  paths: 'exact',
  queryParams: 'ignored',
  fragment: 'ignored',
  matrixParams: 'ignored',
};
const RUTA_Y_PARAMETROS: IsActiveMatchOptions = { ...SOLO_RUTA, queryParams: 'exact' };

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly appName = inject(APP_CONFIG).appName;
  protected readonly soloRuta = SOLO_RUTA;
  protected readonly rutaYParametros = RUTA_Y_PARAMETROS;
  protected readonly paramsAnfitrion = { rol: 'anfitrion' };

  protected readonly usuario = this.session.usuario;
  protected readonly esAnfitrion = computed(
    () => this.usuario()?.roles.includes(RolUsuario.Anfitrion) ?? false,
  );
  protected readonly esAdministrador = computed(
    () => this.usuario()?.roles.includes(RolUsuario.Administrador) ?? false,
  );

  protected cerrarSesion(): void {
    this.session.cerrar();
    this.toast.info('Sesión cerrada', 'Hasta pronto.');
    void this.router.navigateByUrl('/');
  }
}
