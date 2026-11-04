import { Routes } from '@angular/router';
import { autenticadoGuard, rolGuard } from '@features/auth/application/guards/access.guards';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { PublicacionHttpRepository } from '@features/publicaciones/data/repositories/publicacion-http.repository';
import { PublicacionRepository } from '@features/publicaciones/domain/repositories/publicacion.repository';

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
    path: 'publicaciones/nueva',
    title: 'Nueva publicación | Inversiones LR',
    canActivate: [autenticadoGuard, rolGuard([RolUsuario.Anfitrion])],
    // Repositorio con alcance de la ruta: se crea solo al abrir esta pantalla.
    providers: [{ provide: PublicacionRepository, useClass: PublicacionHttpRepository }],
    loadComponent: () =>
      import('@features/publicaciones/presentation/pages/crear-publicacion-page/crear-publicacion-page.component').then(
        (m) => m.CrearPublicacionPageComponent,
      ),
  },
];
