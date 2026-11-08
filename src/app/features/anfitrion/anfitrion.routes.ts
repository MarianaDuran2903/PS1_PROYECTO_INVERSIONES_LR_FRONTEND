import { Provider } from '@angular/core';
import { Routes } from '@angular/router';
import { autenticadoGuard, rolGuard } from '@features/auth/application/guards/access.guards';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { cambiosSinGuardarGuard } from '@features/publicaciones/application/cambios-sin-guardar.guard';
import { PublicacionHttpRepository } from '@features/publicaciones/data/repositories/publicacion-http.repository';
import { PublicacionRepository } from '@features/publicaciones/domain/repositories/publicacion.repository';

/** Repositorio con alcance de la ruta: se crea solo al abrir estas pantallas. */
const REPOSITORIO_DE_PUBLICACIONES: Provider[] = [
  { provide: PublicacionRepository, useClass: PublicacionHttpRepository },
];

const SOLO_ANFITRION = [autenticadoGuard, rolGuard([RolUsuario.Anfitrion])];

export const ANFITRION_ROUTES: Routes = [
  {
    path: '',
    title: 'Panel de anfitrión | Inversiones LR',
    pathMatch: 'full',
    loadComponent: () =>
      import('./presentation/pages/anfitrion-home/anfitrion-home.component').then(
        (m) => m.AnfitrionHomeComponent,
      ),
  },
  {
    path: 'publicaciones',
    title: 'Mis publicaciones | Inversiones LR',
    pathMatch: 'full',
    canActivate: SOLO_ANFITRION,
    providers: REPOSITORIO_DE_PUBLICACIONES,
    loadComponent: () =>
      import('@features/publicaciones/presentation/pages/mis-publicaciones-page/mis-publicaciones-page.component').then(
        (m) => m.MisPublicacionesPageComponent,
      ),
  },
  {
    path: 'publicaciones/nueva',
    title: 'Nueva publicación | Inversiones LR',
    canActivate: SOLO_ANFITRION,
    providers: REPOSITORIO_DE_PUBLICACIONES,
    loadComponent: () =>
      import('@features/publicaciones/presentation/pages/crear-publicacion-page/crear-publicacion-page.component').then(
        (m) => m.CrearPublicacionPageComponent,
      ),
  },
  {
    path: 'publicaciones/:id/editar',
    title: 'Editar publicación | Inversiones LR',
    canActivate: SOLO_ANFITRION,
    // Pide confirmación al salir con cambios sin guardar.
    canDeactivate: [cambiosSinGuardarGuard],
    providers: REPOSITORIO_DE_PUBLICACIONES,
    loadComponent: () =>
      import('@features/publicaciones/presentation/pages/editar-publicacion-page/editar-publicacion-page.component').then(
        (m) => m.EditarPublicacionPageComponent,
      ),
  },
  {
    // Va después de "nueva" y de ":id/editar" para no confundirlas con un id.
    path: 'publicaciones/:id',
    title: 'Detalle de la publicación | Inversiones LR',
    pathMatch: 'full',
    canActivate: SOLO_ANFITRION,
    providers: REPOSITORIO_DE_PUBLICACIONES,
    loadComponent: () =>
      import('@features/publicaciones/presentation/pages/detalle-publicacion-page/detalle-publicacion-page.component').then(
        (m) => m.DetallePublicacionPageComponent,
      ),
  },
];
