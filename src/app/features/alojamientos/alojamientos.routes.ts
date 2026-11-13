import { Provider } from '@angular/core';
import { Routes } from '@angular/router';
import { AlojamientoHttpRepository } from './data/repositories/alojamiento-http.repository';
import { AlojamientoRepository } from './domain/repositories/alojamiento.repository';

/**
 * Repositorio con alcance de la ruta. Lo comparten `/alojamientos` (público) y `/marketplace`
 * (Huésped), que muestran la misma página.
 */
export const PROVEEDORES_DE_ALOJAMIENTOS: Provider[] = [
  { provide: AlojamientoRepository, useClass: AlojamientoHttpRepository },
];

/** Se monta en `/alojamientos`: pública, sin guard. */
export const ALOJAMIENTOS_ROUTES: Routes = [
  {
    path: '',
    title: 'Alojamientos disponibles | Inversiones LR',
    providers: PROVEEDORES_DE_ALOJAMIENTOS,
    loadComponent: () =>
      import('./presentation/pages/alojamientos-page/alojamientos-page.component').then(
        (m) => m.AlojamientosPageComponent,
      ),
  },
];
