import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { EstadoPublicacion, puedeEnviarARevision } from '../../../domain/models/publicacion';

/**
 * Acción de activación de una publicación. En BORRADOR muestra "Enviar a revisión"; en
 * PENDIENTE_REVISION, el texto "En revisión del Administrador"; en los demás estados no muestra
 * nada. Solo emite `enviar`: pedir la confirmación y llamar al servidor es cosa de la página.
 * Lo comparten el listado "Mis publicaciones" y la ficha del detalle.
 */
@Component({
  selector: 'app-accion-activacion',
  template: `
    @if (puedeEnviar()) {
      <button
        type="button"
        [class]="clases()"
        [disabled]="enviando() || deshabilitado()"
        [attr.aria-busy]="enviando()"
        (click)="enviar.emit()"
      >
        @if (enviando()) {
          <span class="spinner" aria-hidden="true"></span>
          Enviando…
        } @else {
          Enviar a revisión
        }
      </button>
    } @else if (enRevision()) {
      <p class="en-revision">En revisión del Administrador</p>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .spinner {
      display: inline-block;
      width: 1em;
      height: 1em;
      margin-right: var(--space-2);
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      vertical-align: -0.15em;
      animation: girar 0.8s linear infinite;
    }

    .en-revision {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-muted);
    }

    @keyframes girar {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccionActivacionComponent {
  readonly estado = input.required<EstadoPublicacion>();
  /** Esta publicación se está enviando ahora. */
  readonly enviando = input(false);
  /** Otra publicación se está enviando: este botón espera. */
  readonly deshabilitado = input(false);
  readonly variante = input<'primary' | 'outline'>('outline');
  /** Ocupa todo el ancho disponible. */
  readonly bloque = input(false);
  readonly enviar = output<void>();

  protected readonly puedeEnviar = computed(() => puedeEnviarARevision(this.estado()));
  protected readonly enRevision = computed(() => this.estado() === 'PENDIENTE_REVISION');
  protected readonly clases = computed(
    () => `btn btn--${this.variante()}${this.bloque() ? ' btn--block' : ''}`,
  );
}
