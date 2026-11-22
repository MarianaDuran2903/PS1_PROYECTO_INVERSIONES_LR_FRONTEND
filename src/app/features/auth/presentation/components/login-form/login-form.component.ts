import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMAIL_PATTERN } from '@shared/validators/form.validators';
import { ErrorMessages, firstErrorMessage } from '@shared/validators/validation-messages';
import { Credenciales } from '../../../domain/models/sesion';

type CampoLogin = 'correo' | 'contrasena';

const MENSAJES: Partial<Record<CampoLogin, ErrorMessages>> = {
  correo: { pattern: 'Ingresa un correo electrónico válido.' },
};

/** Componente de presentación del login: valida el formulario y emite las credenciales. */
@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule],
  templateUrl: './login-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
  readonly enviando = input(false);
  readonly iniciar = output<Credenciales>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = inject(NonNullableFormBuilder).group({
    correo: ['', [Validators.required, Validators.email, Validators.pattern(EMAIL_PATTERN)]],
    contrasena: ['', Validators.required],
  });
  protected readonly mostrarContrasena = signal(false);

  protected errorDe(campo: CampoLogin): string | null {
    const control = this.form.controls[campo];
    return control.touched ? firstErrorMessage(control.errors, MENSAJES[campo]) : null;
  }

  protected alternarContrasena(): void {
    this.mostrarContrasena.update((visible) => !visible);
  }

  protected enviar(): void {
    if (this.enviando()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const primero = (['correo', 'contrasena'] as const).find((campo) => this.errorDe(campo));
      if (primero) {
        this.host.nativeElement.querySelector<HTMLElement>(`#${primero}`)?.focus();
      }
      return;
    }
    this.iniciar.emit(this.form.getRawValue());
  }
}
