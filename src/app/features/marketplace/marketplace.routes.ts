import { Routes } from '@angular/router';

export const MARKETPLACE_ROUTES: Routes = [
  {
    path: '',
    title: 'Marketplace | Inversiones LR',
    loadComponent: () =>
      import('./presentation/pages/marketplace-home/marketplace-home.component').then(
        (m) => m.MarketplaceHomeComponent,
      ),
  },
];
