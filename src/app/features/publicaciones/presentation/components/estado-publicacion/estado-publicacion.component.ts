import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EstadoPublicacion } from '../../../domain/models/publicacion';

export const ETIQUETA_ESTADO: Record<EstadoPublicacion, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_REVISION: 'Pendiente de revisión',
  ACTIVA: 'Activa',
  PAUSADA: 'Pausada',
  BLOQUEADA: 'Bloqueada',
};

/**
 * Etiqueta de color con el estado de una publicación. Es la misma que se usa en la ficha, en la
 * edición y en los listados, para que cada estado se vea igual en todas partes.
 */
@Component({
  selector: 'app-estado-publicacion',
  template: `{{ etiqueta() }}`,
  host: {
    class: 'estado',
    '[class]': '"estado estado--" + estado().toLowerCase()',
  },
  styles: `
    :host {
      display: inline-block;
      padding: 2px var(--space-3);
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.5;
      white-space: nowrap;
    }

    :host(.estado--borrador) {
      color: #8a5a00;
      background: #fdf1d6;
    }

    :host(.estado--pendiente_revision) {
      color: #9a4a00;
      background: #ffe4cc;
    }

    :host(.estado--activa) {
      color: var(--color-primary);
      background: var(--color-primary-soft);
    }

    :host(.estado--pausada) {
      color: #3d4f5c;
      background: #e6ecf0;
    }

    :host(.estado--bloqueada) {
      color: var(--color-danger);
      background: var(--color-danger-bg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadoPublicacionComponent {
  readonly estado = input.required<EstadoPublicacion>();

  protected readonly etiqueta = computed(() => ETIQUETA_ESTADO[this.estado()]);
}
