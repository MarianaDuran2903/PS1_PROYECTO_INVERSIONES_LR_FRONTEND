import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Se muestra cuando hay sesión pero el rol no alcanza para la ruta (RF-USR-003). */
@Component({
  selector: 'app-acceso-denegado-page',
  imports: [RouterLink],
  template: `
    <section class="card denegado" aria-labelledby="denegado-titulo" role="alert">
      <h1 id="denegado-titulo">No tienes acceso a esta sección</h1>
      <p>Tu cuenta no tiene el rol necesario para ver esta página.</p>
      <a class="btn btn--primary" routerLink="/">Volver al inicio</a>
    </section>
  `,
  styles: `
    :host {
      display: block;
      padding: var(--space-8) var(--space-4) var(--space-12);
    }

    .denegado {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-3);
      max-width: 560px;
      margin: 0 auto;
    }

    h1,
    p {
      margin: 0;
    }

    p {
      color: var(--color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccesoDenegadoPageComponent {}
