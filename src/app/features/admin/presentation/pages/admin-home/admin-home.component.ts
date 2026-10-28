import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Página provisional: moderación, auditoría e indicadores (RF-ADM, RF-DASH) vienen después. */
@Component({
  selector: 'app-admin-home',
  template: `
    <section class="card panel">
      <h1>Administración</h1>
      <p>Aquí estarán la moderación, la auditoría y los indicadores del negocio.</p>
    </section>
  `,
  styles: `
    :host {
      display: block;
      padding: var(--space-8) var(--space-4) var(--space-12);
    }

    .panel {
      max-width: 720px;
      margin: 0 auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHomeComponent {}
