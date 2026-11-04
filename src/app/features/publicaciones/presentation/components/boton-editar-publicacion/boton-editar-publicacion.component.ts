import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  EstadoPublicacion,
  motivoNoEditable,
  puedeEditar,
} from '../../../domain/models/publicacion';

/**
 * Botón "Editar" de una publicación. Solo está activo en BORRADOR y PAUSADA: lleva a la pantalla
 * de edición. En los demás estados se muestra apagado y su tooltip explica por qué no se puede.
 * Lo comparten la ficha de la publicación y el listado "Mis publicaciones".
 */
@Component({
  selector: 'app-boton-editar-publicacion',
  imports: [RouterLink],
  template: `
    @if (editable()) {
      <a [class]="clases()" [routerLink]="ruta()">{{ texto() }}</a>
    } @else {
      <!-- aria-disabled (y no disabled) para que el tooltip con el motivo se siga mostrando -->
      <button
        type="button"
        [class]="clases() + ' inactivo'"
        aria-disabled="true"
        [title]="motivo() ?? ''"
        (click)="$event.preventDefault()"
      >
        {{ texto() }}
      </button>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .inactivo {
      opacity: 0.55;
      cursor: not-allowed;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BotonEditarPublicacionComponent {
  readonly idPublicacion = input.required<number>();
  readonly estado = input.required<EstadoPublicacion>();
  readonly texto = input('Editar publicación');
  readonly variante = input<'primary' | 'outline'>('outline');
  /** Ocupa todo el ancho disponible. */
  readonly bloque = input(false);

  protected readonly editable = computed(() => puedeEditar(this.estado()));
  protected readonly motivo = computed(() => motivoNoEditable(this.estado()));
  protected readonly ruta = computed(() => [
    '/anfitrion',
    'publicaciones',
    this.idPublicacion(),
    'editar',
  ]);
  protected readonly clases = computed(
    () => `btn btn--${this.variante()}${this.bloque() ? ' btn--block' : ''}`,
  );
}
