import { Routes } from '@angular/router';
import { rolGuard, autenticadoGuard } from '@features/auth/application/guards/access.guards';
import { exploracionGuard } from '@features/auth/application/guards/exploracion.guard';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { BusquedaAlojamientosHttpRepository } from '@features/marketplace/data/repositories/busqueda-alojamientos-http.repository';
import { CotizacionHttpRepository } from '@features/marketplace/data/repositories/cotizacion-http.repository';
import { BusquedaAlojamientosRepository } from '@features/marketplace/domain/repositories/busqueda-alojamientos.repository';
import { CotizacionRepository } from '@features/marketplace/domain/repositories/cotizacion.repository';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [exploracionGuard],
    title: 'Inversiones LR | Alojamientos con identidad',
    loadComponent: () =>
      import('@features/home/presentation/pages/home-page/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },
  {
    path: '',
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
    canActivate: [rolGuard([RolUsuario.Huesped])],
    loadChildren: () =>
      import('@features/marketplace/marketplace.routes').then((m) => m.MARKETPLACE_ROUTES),
  },
  {
    path: 'anfitrion',
    canActivate: [rolGuard([RolUsuario.Anfitrion])],
    loadChildren: () =>
      import('@features/anfitrion/anfitrion.routes').then((m) => m.ANFITRION_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [rolGuard([RolUsuario.Administrador])],
    loadChildren: () => import('@features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'perfil',
    title: 'Mi perfil | Inversiones LR',
    canActivate: [autenticadoGuard],
    loadComponent: () =>
      import('@features/perfil/presentation/pages/perfil-page/perfil-page.component').then(
        (m) => m.PerfilPageComponent,
      ),
  },
  {
    path: 'alojamientos/:idPublicacion',
    canActivate: [exploracionGuard],
    title: 'Detalle del alojamiento | Inversiones LR',
    providers: [
      {
        provide: BusquedaAlojamientosRepository,
        useClass: BusquedaAlojamientosHttpRepository,
      },
      { provide: CotizacionRepository, useClass: CotizacionHttpRepository },
    ],
    loadComponent: () =>
      import('./features/marketplace/presentation/pages/alojamiento-detalle-page/alojamiento-detalle-page.component').then(
        (m) => m.AlojamientoDetallePageComponent,
      ),
  },
  {
    path: 'alojamientos',
    canActivate: [exploracionGuard],
    title: 'Buscar alojamientos | Inversiones LR',
    providers: [
      {
        provide: BusquedaAlojamientosRepository,
        useClass: BusquedaAlojamientosHttpRepository,
      },
    ],
    loadComponent: () =>
      import('./features/marketplace/presentation/pages/busqueda-alojamientos-page/busqueda-alojamientos-page.component').then(
        (m) => m.BusquedaAlojamientosPageComponent,
      ),
  },

  { path: '**', redirectTo: '' },
];
