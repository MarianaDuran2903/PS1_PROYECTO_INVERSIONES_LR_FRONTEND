import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BuscadorPublicacionComponent } from '../../components/buscador-publicacion/buscador-publicacion.component';

/**
 * Panel del Administrador. Da acceso a la bandeja de publicaciones pendientes de revisión y
 * permite intervenir una publicación a partir de su número. La auditoría y los indicadores
 * (RF-ADM, RF-DASH) vienen después.
 */
@Component({
  selector: 'app-admin-home',
  imports: [BuscadorPublicacionComponent, RouterLink],
  template: `
    <section class="panel">
      <div class="card encabezado">
        <h1>Administración</h1>
        <p>Aquí estarán la moderación, la auditoría y los indicadores del negocio.</p>
      </div>

      <div class="card accesos">
        <h2>Revisión de publicaciones</h2>
        <p>Decide qué alojamientos se ofrecen en la plataforma.</p>
        <a class="btn btn--primary" routerLink="/admin/publicaciones/pendientes"
          >Publicaciones pendientes de revisión</a
        >
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

    .accesos {
      display: grid;
      gap: var(--space-3);
      justify-items: start;
    }

    .accesos h2,
    .accesos p {
      margin: 0;
    }

    .accesos p {
      color: var(--color-text-muted);
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
