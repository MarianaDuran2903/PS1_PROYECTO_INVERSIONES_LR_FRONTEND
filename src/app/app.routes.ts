import { Routes } from '@angular/router';
import { roleGuard } from '@features/auth/application/guards/access.guards';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Inversiones LR | Alojamientos con identidad',
    loadComponent: () =>
      import('@features/home/presentation/pages/home-page/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },
  {
    path: 'auth',
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'acceso-denegado',
    title: 'Acceso denegado | Inversiones LR',
    loadComponent: () =>
      import('@features/auth/presentation/pages/acceso-denegado-page/acceso-denegado-page.component').then(
        (m) => m.AccesoDenegadoPageComponent,
      ),
  },

  // Rutas protegidas por rol (RF-USR-003). El guard lee `data.roles`.
  {
    path: 'marketplace',
    canActivate: [roleGuard],
    data: { roles: [RolUsuario.Huesped] },
    loadChildren: () =>
      import('@features/marketplace/marketplace.routes').then((m) => m.MARKETPLACE_ROUTES),
  },
  {
    path: 'anfitrion',
    canActivate: [roleGuard],
    data: { roles: [RolUsuario.Anfitrion] },
    loadChildren: () =>
      import('@features/anfitrion/anfitrion.routes').then((m) => m.ANFITRION_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { roles: [RolUsuario.Administrador] },
    loadChildren: () => import('@features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  { path: '**', redirectTo: '' },
];
