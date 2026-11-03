import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Página provisional: el listado de publicaciones llega en una historia posterior. */
@Component({
  selector: 'app-anfitrion-home',
  imports: [RouterLink],
  template: `
    <section class="card panel">
      <h1>Panel de anfitrión</h1>
      <p>Aquí podrás crear y administrar tus publicaciones.</p>
      <a class="btn btn--primary" routerLink="/anfitrion/publicaciones/nueva">Nueva publicación</a>
    </section>
  `,
  styles: `
    :host {
      display: block;
      padding: var(--space-8) var(--space-4) var(--space-12);
    }

    .panel {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-3);
      max-width: 720px;
      margin: 0 auto;
    }

    h1,
    p {
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnfitrionHomeComponent {}
