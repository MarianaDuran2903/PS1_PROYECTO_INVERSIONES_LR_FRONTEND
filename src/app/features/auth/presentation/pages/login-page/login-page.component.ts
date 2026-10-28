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
  /** `?registrado=true`: la cuenta se acaba de crear (el registro no abre sesión). */
  readonly registrado = input<string>();
  /** `?expirada=true`: la sesión venció o dejó de ser válida. */
  readonly expirada = input<string>();
}
