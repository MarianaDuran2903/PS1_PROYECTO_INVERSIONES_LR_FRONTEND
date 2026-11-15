import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { longitudEntre } from '@shared/validators/form.validators';
import { firstErrorMessage } from '@shared/validators/validation-messages';

export const MOTIVO_MINIMO = 10;
export const MOTIVO_MAXIMO = 500;

/**
 * Cuadro de diálogo que pide un motivo de texto (de 10 a 500 caracteres, ya recortado) antes de
 * ejecutar una acción, por ejemplo rechazar o bloquear una publicación. Usa el `<dialog>` nativo
 * con `showModal()`: el foco queda atrapado dentro, Escape cancela y al cerrarse el foco vuelve
 * al botón que lo abrió.
 *
 * Lo abre y lo cierra quien lo usa con `abierto`; el componente solo emite `confirmar(motivo)`
 * (con el motivo recortado) o `cancelar`, y no sabe nada del servidor: el mensaje de este llega
 * por `error`.
 */
@Component({
  selector: 'app-modal-motivo',
  imports: [ReactiveFormsModule],
  templateUrl: './modal-motivo.component.html',
  styleUrl: './modal-motivo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalMotivoComponent {
  readonly abierto = input(false);
  readonly titulo = input.required<string>();
  readonly ayuda = input('');
  readonly etiqueta = input('Motivo');
  readonly textoConfirmar = input('Confirmar');
  /** La acción está en curso: el botón de confirmar espera deshabilitado. */
  readonly enviando = input(false);
  /** Mensaje del servidor para el motivo (por ejemplo, si lo rechazó por su largo). */
  readonly error = input<string | null>(null);
  readonly confirmar = output<string>();
  readonly cancelar = output<void>();

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private readonly campo = viewChild.required<ElementRef<HTMLTextAreaElement>>('campo');

  protected readonly motivo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, longitudEntre(MOTIVO_MINIMO, MOTIVO_MAXIMO)],
  });
  protected readonly maximo = MOTIVO_MAXIMO;
  /** Largo del texto recortado, para el contador. */
  protected readonly largo = signal(0);

  constructor() {
    this.motivo.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((valor) => this.largo.set(valor.trim().length));

    effect(() => {
      const dialogo = this.dialogo().nativeElement;
      if (this.abierto()) {
        if (!dialogo.open) {
          this.motivo.reset('');
          dialogo.showModal();
        }
        this.campo().nativeElement.focus();
      } else if (dialogo.open) {
        dialogo.close();
      }
    });
  }

  /** Mensaje de validación local; el del servidor se muestra aparte, con `error`. */
  protected errorLocal(): string | null {
    if (!this.motivo.touched) {
      return null;
    }
    return firstErrorMessage(this.motivo.errors, {
      required: 'Escribe el motivo.',
      longitudEntre: `El motivo debe tener entre ${MOTIVO_MINIMO} y ${MOTIVO_MAXIMO} caracteres.`,
    });
  }

  protected enviar(evento: Event): void {
    evento.preventDefault();
    if (this.enviando()) {
      return;
    }
    if (this.motivo.invalid) {
      this.motivo.markAsTouched();
      this.campo().nativeElement.focus();
      return;
    }
    this.confirmar.emit(this.motivo.value.trim());
  }

  /** Escape: se impide el cierre automático para que lo decida quien usa el componente. */
  protected alPresionarEscape(evento: Event): void {
    evento.preventDefault();
    if (!this.enviando()) {
      this.cancelar.emit();
    }
  }

  protected alCancelar(): void {
    if (!this.enviando()) {
      this.cancelar.emit();
    }
  }
}
