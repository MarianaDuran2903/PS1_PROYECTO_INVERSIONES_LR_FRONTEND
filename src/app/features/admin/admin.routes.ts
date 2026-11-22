import { Provider } from '@angular/core';
import { Routes } from '@angular/router';
import { autenticadoGuard, rolGuard } from '@features/auth/application/guards/access.guards';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { cambiosSinGuardarGuard } from '@features/publicaciones/application/cambios-sin-guardar.guard';
import { PublicacionHttpRepository } from '@features/publicaciones/data/repositories/publicacion-http.repository';
import { PublicacionRepository } from '@features/publicaciones/domain/repositories/publicacion.repository';
import { PublicacionAdminHttpRepository } from './data/repositories/publicacion-admin-http.repository';
import { PublicacionAdminRepository } from './domain/repositories/publicacion-admin.repository';

/**
 * Repositorios con alcance de la ruta. El de publicaciones se usa solo por sus catálogos
 * (ciudades y tipos), que cualquier rol con token puede consultar.
 */
const REPOSITORIOS_DE_INTERVENCION: Provider[] = [
  { provide: PublicacionAdminRepository, useClass: PublicacionAdminHttpRepository },
  { provide: PublicacionRepository, useClass: PublicacionHttpRepository },
];

/** La gestión, la bandeja de revisión y el detalle solo necesitan el repositorio administrativo. */
const REPOSITORIO_DE_REVISION: Provider[] = [
  { provide: PublicacionAdminRepository, useClass: PublicacionAdminHttpRepository },
];

/** Todas las pantallas de gestión exigen sesión y rol Administrador. */
const GUARDS_DE_GESTION = [autenticadoGuard, rolGuard([RolUsuario.Administrador])];

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    title: 'Administración | Inversiones LR',
    pathMatch: 'full',
    loadComponent: () =>
      import('./presentation/pages/admin-home/admin-home.component').then(
        (m) => m.AdminHomeComponent,
      ),
  },
  {
    path: 'publicaciones',
    title: 'Gestión de publicaciones | Inversiones LR',
    pathMatch: 'full',
    canActivate: GUARDS_DE_GESTION,
    providers: REPOSITORIO_DE_REVISION,
    loadComponent: () =>
      import('./presentation/pages/gestion-publicaciones-page/gestion-publicaciones-page.component').then(
        (m) => m.GestionPublicacionesPageComponent,
      ),
  },
  {
    path: 'publicaciones/pendientes',
    title: 'Publicaciones pendientes | Inversiones LR',
    canActivate: GUARDS_DE_GESTION,
    providers: REPOSITORIO_DE_REVISION,
    loadComponent: () =>
      import('./presentation/pages/bandeja-pendientes-page/bandeja-pendientes-page.component').then(
        (m) => m.BandejaPendientesPageComponent,
      ),
  },
  // Va después de `pendientes`, que si no se tomaría por un id.
  {
    path: 'publicaciones/:id',
    title: 'Detalle de la publicación | Inversiones LR',
    canActivate: GUARDS_DE_GESTION,
    providers: REPOSITORIO_DE_REVISION,
    loadComponent: () =>
      import('./presentation/pages/detalle-publicacion-admin-page/detalle-publicacion-admin-page.component').then(
        (m) => m.DetallePublicacionAdminPageComponent,
      ),
  },
  {
    path: 'publicaciones/:id/editar',
    title: 'Intervenir publicación | Inversiones LR',
    canActivate: GUARDS_DE_GESTION,
    // Pide confirmación al salir con cambios sin guardar.
    canDeactivate: [cambiosSinGuardarGuard],
    providers: REPOSITORIOS_DE_INTERVENCION,
    loadComponent: () =>
      import('./presentation/pages/intervenir-publicacion-page/intervenir-publicacion-page.component').then(
        (m) => m.IntervenirPublicacionPageComponent,
      ),
  },
];
