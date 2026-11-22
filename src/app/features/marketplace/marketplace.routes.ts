import { Routes } from '@angular/router';
import { PROVEEDORES_DE_ALOJAMIENTOS } from '@features/alojamientos/alojamientos.routes';

/**
 * El Marketplace del Huésped muestra el mismo listado de alojamientos disponibles que la ruta
 * pública `/alojamientos`: reutiliza su página y su repositorio en lugar de duplicarlos.
 */
export const MARKETPLACE_ROUTES: Routes = [
  {
    path: '',
    title: 'Marketplace | Inversiones LR',
    providers: PROVEEDORES_DE_ALOJAMIENTOS,
    loadComponent: () =>
      import('@features/alojamientos/presentation/pages/alojamientos-page/alojamientos-page.component').then(
        (m) => m.AlojamientosPageComponent,
      ),
  },
];
