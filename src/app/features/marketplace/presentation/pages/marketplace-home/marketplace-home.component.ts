import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Página provisional: la búsqueda de alojamientos se implementa en una historia posterior. */
@Component({
  selector: 'app-marketplace-home',
  template: `
    <section class="card marketplace">
      <h1>Marketplace de alojamientos</h1>
      <p>Pronto podrás buscar, cotizar y reservar alojamientos desde aquí.</p>
    </section>
  `,
  styles: `
    :host {
      display: block;
      padding: var(--space-8) var(--space-4) var(--space-12);
    }

    .marketplace {
      max-width: 720px;
      margin: 0 auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceHomeComponent {}
