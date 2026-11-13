import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BuscadorPublicacionComponent } from '../../components/buscador-publicacion/buscador-publicacion.component';

/**
 * Panel del Administrador. La moderación, la auditoría y los indicadores (RF-ADM, RF-DASH) vienen
 * después; por ahora permite intervenir una publicación a partir de su número.
 */
@Component({
  selector: 'app-admin-home',
  imports: [BuscadorPublicacionComponent],
  template: `
    <section class="panel">
      <div class="card encabezado">
        <h1>Administración</h1>
        <p>Aquí estarán la moderación, la auditoría y los indicadores del negocio.</p>
      </div>

      <app-buscador-publicacion (buscar)="intervenir($event)" />
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
      gap: var(--space-4);
      max-width: 720px;
      margin: 0 auto;
    }

    .encabezado h1,
    .encabezado p {
      margin: 0;
    }

    .encabezado p {
      margin-top: var(--space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHomeComponent {
  private readonly router = inject(Router);

  protected intervenir(idPublicacion: number): void {
    void this.router.navigate(['/admin', 'publicaciones', idPublicacion, 'editar']);
  }
}
