import { Routes } from '@angular/router';
import { invitadoGuard } from './application/guards/access.guards';

/** Se montan en la raíz: `/login` y `/registro`. */
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
];
