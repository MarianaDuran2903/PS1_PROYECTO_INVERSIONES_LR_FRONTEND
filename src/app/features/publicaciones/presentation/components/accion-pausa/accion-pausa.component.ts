import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { EstadoPublicacion, puedePausar } from '../../../domain/models/publicacion';

/**
 * Acción de pausa de una publicación. En ACTIVA muestra el botón "Pausar"; en PAUSADA, el texto
 * "El Administrador revisará tus ajustes antes de reactivarla"; en los demás estados no muestra
 * nada. Solo emite `pausar`: pedir la confirmación y llamar al servidor es cosa de la página.
 * Lo comparten el listado "Mis publicaciones" y la ficha del detalle.
 */
@Component({
  selector: 'app-accion-pausa',
  template: `
    @if (puedePausar()) {
      <button
        type="button"
        [class]="clases()"
        [disabled]="pausando() || deshabilitado()"
        [attr.aria-busy]="pausando()"
        (click)="pausar.emit()"
      >
        @if (pausando()) {
          <span class="spinner" aria-hidden="true"></span>
          Pausando…
        } @else {
          Pausar
        }
      </button>
    } @else if (pausada()) {
      <p class="pausada">El Administrador revisará tus ajustes antes de reactivarla</p>
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

    .pausada {
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
export class AccionPausaComponent {
  readonly estado = input.required<EstadoPublicacion>();
  /** Esta publicación se está pausando ahora. */
  readonly pausando = input(false);
  /** Otra acción está en curso: este botón espera. */
  readonly deshabilitado = input(false);
  readonly variante = input<'primary' | 'outline'>('outline');
  /** Ocupa todo el ancho disponible. */
  readonly bloque = input(false);
  readonly pausar = output<void>();

  protected readonly puedePausar = computed(() => puedePausar(this.estado()));
  protected readonly pausada = computed(() => this.estado() === 'PAUSADA');
  protected readonly clases = computed(
    () => `btn btn--${this.variante()}${this.bloque() ? ' btn--block' : ''}`,
  );
}
