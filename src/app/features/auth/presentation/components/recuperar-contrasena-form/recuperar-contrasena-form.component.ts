import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMAIL_MAX_LENGTH, EMAIL_PATTERN, notBlank } from '@shared/validators/form.validators';
import { firstErrorMessage } from '@shared/validators/validation-messages';

/**
 * Componente de presentación: un solo campo, el correo. No conoce servicios ni HTTP; recibe el
 * estado por inputs y emite el correo cuando es válido.
 */
@Component({
  selector: 'app-recuperar-contrasena-form',
  imports: [ReactiveFormsModule],
  templateUrl: './recuperar-contrasena-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarContrasenaFormComponent {
  readonly enviando = input(false);
  /** Error del servidor para el correo (400 con `errores.correo`). */
  readonly errorCorreoServidor = input<string | null>(null);
  readonly solicitar = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly correoMaxLength = EMAIL_MAX_LENGTH;
  protected readonly form = inject(NonNullableFormBuilder).group({
    correo: [
      '',
      [
        Validators.required,
        notBlank(),
        Validators.email,
        Validators.pattern(EMAIL_PATTERN),
        Validators.maxLength(EMAIL_MAX_LENGTH),
      ],
    ],
  });

  constructor() {
    effect(() => {
      const mensaje = this.errorCorreoServidor();
      const control = this.form.controls.correo;
      if (mensaje) {
        control.setErrors({ ...control.errors, servidor: mensaje });
        control.markAsTouched();
      }
    });
  }

  protected errorCorreo(): string | null {
    const control = this.form.controls.correo;
    if (!control.touched) {
      return null;
    }
    const errorServidor: unknown = control.getError('servidor');
    if (typeof errorServidor === 'string') {
      return errorServidor;
    }
    return firstErrorMessage(control.errors, { pattern: 'Ingresa un correo electrónico válido.' });
  }

  protected enviar(): void {
    if (this.enviando()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('#correo')?.focus();
      return;
    }
    this.solicitar.emit(this.form.controls.correo.value.trim());
  }
}
