import { Routes } from '@angular/router';
import { invitadoGuard } from './application/guards/access.guards';

/** Se montan en la raíz: `/login`, `/registro` y la recuperación de contraseña. */
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión | Inversiones LR',
    // Login y registro no tienen sentido con una sesión abierta.
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./presentation/pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
  },
  {
    path: 'registro',
    title: 'Registro | Inversiones LR',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./presentation/pages/registro-page/registro-page.component').then(
        (m) => m.RegistroPageComponent,
      ),
  },
  {
    path: 'recuperar-contrasena',
    title: 'Recuperar contraseña | Inversiones LR',
    // Quien ya tiene sesión no recupera la contraseña.
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./presentation/pages/recuperar-contrasena-page/recuperar-contrasena-page.component').then(
        (m) => m.RecuperarContrasenaPageComponent,
      ),
  },
  {
    path: 'restablecer-contrasena',
    title: 'Nueva contraseña | Inversiones LR',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./presentation/pages/restablecer-contrasena-page/restablecer-contrasena-page.component').then(
        (m) => m.RestablecerContrasenaPageComponent,
      ),
  },
];
