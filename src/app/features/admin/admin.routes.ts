import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    title: 'Administración | Inversiones LR',
    loadComponent: () =>
      import('./presentation/pages/admin-home/admin-home.component').then(
        (m) => m.AdminHomeComponent,
      ),
  },
];
