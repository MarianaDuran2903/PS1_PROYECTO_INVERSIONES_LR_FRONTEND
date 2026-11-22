import { Routes } from '@angular/router';
import { PagoHttpRepository } from './data/repositories/pago-http.repository';
import { PagoRepository } from './domain/repositories/pago.repository';

/**
 * Se montan en `/reservas` y solo para el Huésped. `…/pago/resultado` es la dirección a la que
 * regresa la pasarela de pago (con `?cancelado=true` si la persona volvió sin pagar).
 */
export const RESERVAS_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: PagoRepository, useClass: PagoHttpRepository }],
    children: [
      {
        path: ':idReserva/pago/resultado',
        title: 'Resultado del pago | Inversiones LR',
        loadComponent: () =>
          import('./presentation/pages/resultado-pago-page/resultado-pago-page.component').then(
            (m) => m.ResultadoPagoPageComponent,
          ),
      },
      {
        path: ':idReserva/pago',
        title: 'Pagar reserva | Inversiones LR',
        loadComponent: () =>
          import('./presentation/pages/pagar-reserva-page/pagar-reserva-page.component').then(
            (m) => m.PagarReservaPageComponent,
          ),
      },
    ],
  },
];
