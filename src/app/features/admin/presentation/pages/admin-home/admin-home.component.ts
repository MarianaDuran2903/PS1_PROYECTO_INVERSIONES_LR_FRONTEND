import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Panel del Administrador. Da acceso a la gestión de publicaciones (pendientes, activas, pausadas,
 * bloqueadas y todas) y a la bandeja de pendientes de revisión. La auditoría y los indicadores
 * (RF-ADM, RF-DASH) vienen después.
 */
@Component({
  selector: 'app-admin-home',
  imports: [RouterLink],
  template: `
    <section class="panel">
      <div class="card encabezado">
        <h1>Administración</h1>
        <p>Aquí estarán la moderación, la auditoría y los indicadores del negocio.</p>
      </div>

      <div class="card accesos">
        <h2>Publicaciones</h2>
        <p>Revisa, bloquea y reactiva las publicaciones de la plataforma.</p>
        <div class="accesos__botones">
          <a class="btn btn--primary" routerLink="/admin/publicaciones">Gestión de publicaciones</a>
          <a class="btn btn--outline" routerLink="/admin/publicaciones/pendientes"
            >Publicaciones pendientes de revisión</a
          >
        </div>
      </div>
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

    .accesos__botones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHomeComponent {}
