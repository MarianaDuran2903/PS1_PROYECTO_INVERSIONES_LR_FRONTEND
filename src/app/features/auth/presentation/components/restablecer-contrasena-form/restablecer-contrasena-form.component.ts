import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  matchFields,
  notBlank,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  strongPassword,
} from '@shared/validators/form.validators';
import { ErrorMessages, firstErrorMessage } from '@shared/validators/validation-messages';
import { ErroresRestablecimiento } from '../../../domain/models/recuperacion';
import { RequisitosContrasenaComponent } from '../requisitos-contrasena/requisitos-contrasena.component';

/** Lo que emite el formulario. `token` solo viene cuando la persona lo pegó en el campo. */
export interface DatosRestablecimiento {
  token: string | null;
  contrasena: string;
  confirmarContrasena: string;
}

function crearFormulario(fb: NonNullableFormBuilder) {
  return fb.group(
    {
      token: [''],
      contrasena: [
        '',
        [
          Validators.required,
          Validators.minLength(PASSWORD_MIN_LENGTH),
          Validators.maxLength(PASSWORD_MAX_LENGTH),
          strongPassword(),
        ],
      ],
      confirmarContrasena: ['', Validators.required],
    },
    { validators: matchFields('contrasena', 'confirmarContrasena') },
  );
}

type FormularioRestablecer = ReturnType<typeof crearFormulario>;
type CampoFormulario = keyof FormularioRestablecer['controls'];

const LARGO_CONTRASENA = `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`;

const MENSAJES: Partial<Record<CampoFormulario, ErrorMessages>> = {
  token: { required: 'Pega el código de recuperación.', blank: 'Pega el código de recuperación.' },
  contrasena: { minlength: LARGO_CONTRASENA, maxlength: LARGO_CONTRASENA },
  confirmarContrasena: { required: 'Confirma tu contraseña.' },
};

/**
 * Componente de presentación: nueva contraseña, su confirmación y, si el enlace no trajo el
 * código, un campo para pegarlo. Nada de esto se guarda: solo se emite al enviar.
 */
@Component({
  selector: 'app-restablecer-contrasena-form',
  imports: [ReactiveFormsModule, RequisitosContrasenaComponent],
  templateUrl: './restablecer-contrasena-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestablecerContrasenaFormComponent {
  readonly enviando = input(false);
  /** true cuando el enlace no trajo el código y hay que pegarlo. */
  readonly pedirToken = input(false);
  /** Errores por campo devueltos por el servidor. */
  readonly erroresServidor = input<ErroresRestablecimiento>({});
  readonly restablecer = output<DatosRestablecimiento>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form: FormularioRestablecer = crearFormulario(inject(NonNullableFormBuilder));
  protected readonly mostrarContrasena = signal(false);
  protected readonly contrasenaMaxLength = PASSWORD_MAX_LENGTH;
  /** Copia de la contraseña solo para el checklist en vivo; no se guarda en ningún otro lado. */
  protected readonly contrasenaEscrita = signal('');

  constructor() {
    effect(() => {
      const token = this.form.controls.token;
      if (this.pedirToken()) {
        token.setValidators([Validators.required, notBlank()]);
        token.enable();
      } else {
        token.clearValidators();
        token.disable();
      }
      token.updateValueAndValidity();
    });

    effect(() => {
      const errores = this.erroresServidor();
      let primero: CampoFormulario | null = null;
      for (const campo of Object.keys(this.form.controls) as CampoFormulario[]) {
        const mensaje = errores[campo];
        const control = this.form.controls[campo];
        if (mensaje && !(campo === 'token' && !this.pedirToken())) {
          control.setErrors({ ...control.errors, servidor: mensaje });
          control.markAsTouched();
          primero ??= campo;
        }
      }
      if (primero) {
        this.enfocar(primero);
      }
    });

    this.form.controls.contrasena.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((valor) => this.contrasenaEscrita.set(valor));
  }

  protected errorDe(campo: CampoFormulario): string | null {
    const control = this.form.controls[campo];
    if (!control.touched) {
      return null;
    }
    const errorServidor: unknown = control.getError('servidor');
    if (typeof errorServidor === 'string') {
      return errorServidor;
    }
    if (
      campo === 'confirmarContrasena' &&
      !control.errors &&
      this.form.hasError('fieldsMismatch')
    ) {
      return firstErrorMessage({ fieldsMismatch: true });
    }
    return firstErrorMessage(control.errors, MENSAJES[campo]);
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
      const campos = Object.keys(this.form.controls) as CampoFormulario[];
      const primero = campos.find((campo) => this.errorDe(campo) !== null);
      if (primero) {
        this.enfocar(primero);
      }
      return;
    }

    const valor = this.form.getRawValue();
    this.restablecer.emit({
      token: this.pedirToken() ? valor.token.trim() : null,
      contrasena: valor.contrasena,
      confirmarContrasena: valor.confirmarContrasena,
    });
  }

  private enfocar(campo: CampoFormulario): void {
    this.host.nativeElement.querySelector<HTMLElement>(`#${campo}`)?.focus();
  }
}
