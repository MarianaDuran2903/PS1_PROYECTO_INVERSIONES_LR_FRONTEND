import { Routes } from '@angular/router';

export const ANFITRION_ROUTES: Routes = [
  {
    path: '',
    title: 'Panel de anfitrión | Inversiones LR',
    loadComponent: () =>
      import('./presentation/pages/anfitrion-home/anfitrion-home.component').then(
        (m) => m.AnfitrionHomeComponent,
      ),
  },
];
