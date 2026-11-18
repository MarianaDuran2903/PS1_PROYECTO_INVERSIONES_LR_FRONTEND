import { Provider } from '@angular/core';
import { Routes } from '@angular/router';
import { AlojamientoHttpRepository } from './data/repositories/alojamiento-http.repository';
import { AlojamientoRepository } from './domain/repositories/alojamiento.repository';

/**
 * Proveedores del listado existente utilizado por el área del Huésped
 * en /marketplace.
 */
export const PROVEEDORES_DE_ALOJAMIENTOS: Provider[] = [
  { provide: AlojamientoRepository, useClass: AlojamientoHttpRepository },
];

/** Configuración del listado anterior, no montada en app.routes.ts. */
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
