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
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  matchFields,
  notBlank,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PERSON_NAME_MAX_LENGTH,
  personName,
  strongPassword,
} from '@shared/validators/form.validators';
import { ErrorMessages, firstErrorMessage } from '@shared/validators/validation-messages';
import { ErroresRegistro, RegistroUsuario } from '../../../domain/models/registro-usuario';
import { RolRegistrable, ROLES_REGISTRABLES, RolUsuario } from '../../../domain/models/rol-usuario';

interface OpcionRol {
  valor: RolRegistrable;
  titulo: string;
  descripcion: string;
}

const OPCIONES_ROL: readonly OpcionRol[] = [
  {
    valor: RolUsuario.Huesped,
    titulo: 'Huésped',
    descripcion: 'Busca, cotiza y reserva alojamientos.',
  },
  {
    valor: RolUsuario.Anfitrion,
    titulo: 'Anfitrión',
    descripcion: 'Publica y administra tus alojamientos.',
  },
];

const NOMBRE_MAX_LENGTH = PERSON_NAME_MAX_LENGTH;
const CORREO_MAX_LENGTH = EMAIL_MAX_LENGTH;

const nombreOpcional: ValidatorFn[] = [Validators.maxLength(NOMBRE_MAX_LENGTH), personName()];
const nombreRequerido: ValidatorFn[] = [Validators.required, notBlank(), ...nombreOpcional];

function crearFormulario(fb: NonNullableFormBuilder) {
  return fb.group(
    {
      rol: [RolUsuario.Huesped as RolRegistrable, Validators.required],
      primerNombre: ['', nombreRequerido],
      segundoNombre: ['', nombreOpcional],
      primerApellido: ['', nombreRequerido],
      segundoApellido: ['', nombreOpcional],
      correo: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.pattern(EMAIL_PATTERN),
          Validators.maxLength(CORREO_MAX_LENGTH),
        ],
      ],
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

type FormularioRegistro = ReturnType<typeof crearFormulario>;
type CampoFormulario = keyof FormularioRegistro['controls'];

const LARGO_CONTRASENA = `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`;

const MENSAJES: Partial<Record<CampoFormulario, ErrorMessages>> = {
  correo: { pattern: 'Ingresa un correo electrónico válido.' },
  contrasena: { minlength: LARGO_CONTRASENA, maxlength: LARGO_CONTRASENA },
  confirmarContrasena: { required: 'Confirma tu contraseña.' },
};

/**
 * Componente de presentación: solo maneja el formulario y su validación.
 * No conoce servicios ni HTTP; recibe el estado por inputs y emite los datos válidos.
 */
@Component({
  selector: 'app-registro-form',
  imports: [ReactiveFormsModule],
  templateUrl: './registro-form.component.html',
  styleUrl: './registro-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroFormComponent {
  readonly enviando = input(false);
  /** Rol preseleccionado (p. ej. al llegar desde "Quiero ser anfitrión"). */
  readonly rolInicial = input<RolRegistrable>(RolUsuario.Huesped);
  /** Errores por campo devueltos por el servidor (p. ej. correo ya registrado). */
  readonly erroresServidor = input<ErroresRegistro>({});
  readonly registrar = output<RegistroUsuario>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form: FormularioRegistro = crearFormulario(inject(NonNullableFormBuilder));
  protected readonly opcionesRol = OPCIONES_ROL;
  protected readonly mostrarContrasena = signal(false);
  protected readonly nombreMaxLength = NOMBRE_MAX_LENGTH;
  protected readonly correoMaxLength = CORREO_MAX_LENGTH;
  protected readonly contrasenaMinLength = PASSWORD_MIN_LENGTH;
  protected readonly contrasenaMaxLength = PASSWORD_MAX_LENGTH;

  constructor() {
    effect(() => {
      const rol = this.rolInicial();
      if (ROLES_REGISTRABLES.includes(rol)) {
        this.form.controls.rol.setValue(rol);
      }
    });

    effect(() => {
      for (const [campo, mensaje] of Object.entries(this.erroresServidor())) {
        const control = this.form.get(campo);
        if (control && mensaje) {
          control.setErrors({ ...control.errors, servidor: mensaje });
          control.markAsTouched();
        }
      }
    });
  }

  protected errorDe(campo: CampoFormulario): string | null {
    const control = this.form.controls[campo];
    if (!control.touched) {
      return null;
    }
    // El mensaje del servidor tiene prioridad sobre las validaciones locales.
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
      this.enfocarPrimerError();
      return;
    }

    const valor = this.form.getRawValue();
    this.registrar.emit({
      rol: valor.rol,
      primerNombre: valor.primerNombre,
      segundoNombre: valor.segundoNombre,
      primerApellido: valor.primerApellido,
      segundoApellido: valor.segundoApellido,
      correo: valor.correo,
      contrasena: valor.contrasena,
      confirmarContrasena: valor.confirmarContrasena,
    });
  }

  private enfocarPrimerError(): void {
    const campos = Object.keys(this.form.controls) as CampoFormulario[];
    const primero = campos.find((campo) => this.errorDe(campo) !== null);
    if (primero) {
      this.host.nativeElement.querySelector<HTMLElement>(`#${primero}`)?.focus();
    }
  }
}
