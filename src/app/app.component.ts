import { UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent, UpperCasePipe],
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
  protected readonly menuCuentaAbierto = signal(false);
  protected readonly esAnfitrion = computed(
    () => this.usuario()?.roles.includes(RolUsuario.Anfitrion) ?? false,
  );
  protected readonly esAdministrador = computed(
    () => this.usuario()?.roles.includes(RolUsuario.Administrador) ?? false,
  );

  protected cerrarSesion(): void {
    this.cerrarMenuCuenta();
    this.session.cerrar();
    this.toast.info('Sesión cerrada', 'Hasta pronto.');
    void this.router.navigateByUrl('/');
  }

  protected alternarMenuCuenta(): void {
    this.menuCuentaAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenuCuenta(): void {
    this.menuCuentaAbierto.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected detectarClickFuera(event: MouseEvent): void {
    const elemento = event.target as HTMLElement;

    if (!elemento.closest('.cuenta')) {
      this.cerrarMenuCuenta();
    }
  }

  @HostListener('document:keydown.escape')
  protected detectarEscape(): void {
    this.cerrarMenuCuenta();
  }
}
