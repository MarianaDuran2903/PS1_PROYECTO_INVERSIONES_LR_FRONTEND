import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Página provisional: la gestión de publicaciones (RF-ALOJ) se implementa en historias posteriores. */
@Component({
  selector: 'app-anfitrion-home',
  template: `
    <section class="card panel">
      <h1>Panel de anfitrión</h1>
      <p>Aquí podrás crear y administrar tus publicaciones.</p>
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
export class AnfitrionHomeComponent {}
