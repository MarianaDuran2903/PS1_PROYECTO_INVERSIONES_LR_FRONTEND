import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PendienteActivacion } from '../../../application/solicitar-activacion.facade';

/**
 * Panel con la información que falta para enviar una publicación a revisión: cada campo con el
 * mensaje del backend y un enlace para completarla en la edición. Aparece cuando el backend
 * rechaza la solicitud (400); la publicación sigue como estaba.
 */
@Component({
  selector: 'app-pendientes-activacion',
  imports: [RouterLink],
  template: `
    <div class="alert alert--danger pendientes" role="alert">
      <p class="pendientes__titulo">
        {{ titulo() }}
      </p>
      <ul class="pendientes__lista">
        @for (pendiente of pendientes(); track pendiente.campo) {
          <li [attr.data-campo]="pendiente.campo">{{ pendiente.mensaje }}</li>
        }
      </ul>
      <a class="btn btn--outline" [routerLink]="ruta()">Completar publicación</a>
    </div>
  `,
  styles: `
    .pendientes {
      display: grid;
      gap: var(--space-3);
      justify-items: start;
    }

    .pendientes__titulo {
      margin: 0;
      font-weight: 700;
    }

    .pendientes__lista {
      margin: 0;
      padding-left: var(--space-5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendientesActivacionComponent {
  readonly idPublicacion = input.required<number>();
  readonly pendientes = input.required<PendienteActivacion[]>();
  /** Título de la publicación, si se conoce, para decir de cuál se trata. */
  readonly tituloPublicacion = input<string | null>(null);

  protected readonly titulo = computed(() => {
    const nombre = this.tituloPublicacion();
    return nombre
      ? `Falta información para enviar «${nombre}» a revisión`
      : 'Falta información para enviar la publicación a revisión';
  });
  protected readonly ruta = computed(() => [
    '/anfitrion',
    'publicaciones',
    this.idPublicacion(),
    'editar',
  ]);
}
