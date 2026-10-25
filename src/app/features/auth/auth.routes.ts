import { Routes } from '@angular/router';
import { guestGuard } from './application/guards/access.guards';
import { provideAuthData } from './data/auth-data.providers';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    // Repositorio con alcance de la feature (se crea al cargar /auth).
    providers: [provideAuthData()],
    // Login y registro no tienen sentido con una sesión abierta.
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        title: 'Iniciar sesión | Inversiones LR',
        loadComponent: () =>
          import('./presentation/pages/login-page/login-page.component').then(
            (m) => m.LoginPageComponent,
          ),
      },
      {
        path: 'registro',
        title: 'Registro | Inversiones LR',
        loadComponent: () =>
          import('./presentation/pages/registro-page/registro-page.component').then(
            (m) => m.RegistroPageComponent,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
];
