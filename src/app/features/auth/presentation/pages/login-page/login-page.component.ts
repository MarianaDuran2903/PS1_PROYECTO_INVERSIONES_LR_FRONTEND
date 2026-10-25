import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginFacade } from '../../../application/login.facade';
import { LoginFormComponent } from '../../components/login-form/login-form.component';

/** Contenedor (smart) del login. `returnUrl` llega como query param (lo pone el guard). */
@Component({
  selector: 'app-login-page',
  imports: [LoginFormComponent, RouterLink],
  providers: [LoginFacade],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  protected readonly facade = inject(LoginFacade);
  readonly returnUrl = input<string>();
}
