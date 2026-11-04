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
import { decimalPositivo, enteroPositivo, notBlank } from '@shared/validators/form.validators';
import { ErrorMessages, firstErrorMessage } from '@shared/validators/validation-messages';
import { IconoAlojamientoComponent } from '@shared/ui/icono-alojamiento/icono-alojamiento.component';
import { formatearPesos } from '../../../application/moneda';
import { CatalogoItem, NuevaPublicacion } from '../../../domain/models/publicacion';

const TITULO_MAX = 150;
const DESCRIPCION_MAX = 1000;
const DIRECCION_MAX = 250;
const BARRIO_MAX = 120;

function crearFormulario(fb: NonNullableFormBuilder) {
  return fb.group({
    titulo: ['', [Validators.required, notBlank(), Validators.maxLength(TITULO_MAX)]],
    descripcion: ['', [Validators.required, notBlank(), Validators.maxLength(DESCRIPCION_MAX)]],
    direccionTextual: ['', [Validators.required, notBlank(), Validators.maxLength(DIRECCION_MAX)]],
    idCiudad: fb.control<number | null>(null, Validators.required),
    barrioZona: ['', Validators.maxLength(BARRIO_MAX)],
    idTipo: fb.control<number | null>(null, Validators.required),
    // Texto, no number: así el validador puede explicar el error en vez de que el navegador
    // descarte el valor en silencio. Se convierte a número al enviar.
    capacidad: ['', [Validators.required, notBlank(), enteroPositivo()]],
    precioNoche: ['', [Validators.required, notBlank(), decimalPositivo()]],
  });
}

type FormularioPublicacion = ReturnType<typeof crearFormulario>;
type CampoFormulario = keyof FormularioPublicacion['controls'];

const MENSAJE_CAPACIDAD = 'La capacidad debe ser un número entero mayor que 0';
const MENSAJE_PRECIO = 'El precio por noche debe ser mayor que 0';

/** Mensajes de la historia, los mismos que devuelve el backend. */
const MENSAJES: Record<CampoFormulario, ErrorMessages> = {
  titulo: {
    required: 'El título es obligatorio',
    blank: 'El título es obligatorio',
    maxlength: `El título admite máximo ${TITULO_MAX} caracteres`,
  },
  descripcion: {
    required: 'La descripción es obligatoria',
    blank: 'La descripción es obligatoria',
    maxlength: `La descripción admite máximo ${DESCRIPCION_MAX} caracteres`,
  },
  direccionTextual: {
    required: 'La dirección es obligatoria',
    blank: 'La dirección es obligatoria',
    maxlength: `La dirección admite máximo ${DIRECCION_MAX} caracteres`,
  },
  idCiudad: { required: 'La ciudad es obligatoria' },
  barrioZona: { maxlength: `El barrio o zona admite máximo ${BARRIO_MAX} caracteres` },
  idTipo: { required: 'El tipo de alojamiento es obligatorio' },
  capacidad: {
    required: MENSAJE_CAPACIDAD,
    blank: MENSAJE_CAPACIDAD,
    enteroPositivo: MENSAJE_CAPACIDAD,
  },
  precioNoche: {
    required: MENSAJE_PRECIO,
    blank: MENSAJE_PRECIO,
    decimalPositivo: MENSAJE_PRECIO,
  },
};

/**
 * Componente de presentación: solo maneja el formulario y su validación.
 * Recibe los catálogos y el estado por inputs y emite los datos válidos, ya como números.
 */
@Component({
  selector: 'app-crear-publicacion-form',
  imports: [ReactiveFormsModule, IconoAlojamientoComponent],
  templateUrl: './crear-publicacion-form.component.html',
  styleUrl: './crear-publicacion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearPublicacionFormComponent {
  readonly ciudades = input<CatalogoItem[]>([]);
  readonly tipos = input<CatalogoItem[]>([]);
  readonly enviando = input(false);
  /** Errores por campo devueltos por el servidor (400 con `errores`). */
  readonly erroresServidor = input<Partial<Record<CampoFormulario, string>>>({});
  readonly guardar = output<NuevaPublicacion>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form: FormularioPublicacion = crearFormulario(inject(NonNullableFormBuilder));
  protected readonly descripcionMax = DESCRIPCION_MAX;

  constructor() {
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
    return firstErrorMessage(control.errors, MENSAJES[campo]);
  }

  /** Vista previa del precio en pesos colombianos; null mientras el valor no sea válido. */
  protected precioFormateado(): string | null {
    const control = this.form.controls.precioNoche;
    return control.valid && control.value.trim().length > 0
      ? formatearPesos(Number(control.value.trim()))
      : null;
  }

  /** Datos del resumen lateral: se actualizan mientras la persona escribe. */
  protected nombreCiudad(): string | null {
    const id = this.form.controls.idCiudad.value;
    return this.ciudades().find((ciudad) => ciudad.id === id)?.nombre ?? null;
  }

  protected nombreTipo(): string | null {
    const id = this.form.controls.idTipo.value;
    return this.tipos().find((tipo) => tipo.id === id)?.nombre ?? null;
  }

  protected textoCapacidad(): string | null {
    const control = this.form.controls.capacidad;
    if (control.invalid || control.value.trim().length === 0) {
      return null;
    }
    const capacidad = Number(control.value.trim());
    return `${capacidad} ${capacidad === 1 ? 'huésped' : 'huéspedes'}`;
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
    if (valor.idCiudad === null || valor.idTipo === null) {
      return;
    }
    this.guardar.emit({
      titulo: valor.titulo,
      descripcion: valor.descripcion,
      direccionTextual: valor.direccionTextual,
      idCiudad: valor.idCiudad,
      barrioZona: valor.barrioZona,
      idTipo: valor.idTipo,
      capacidad: Number(valor.capacidad.trim()),
      precioNoche: Number(valor.precioNoche.trim()),
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
