import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconoAlojamientoComponent } from '@shared/ui/icono-alojamiento/icono-alojamiento.component';
import {
  decimalNoNegativo,
  decimalPositivo,
  enteroPositivo,
  notBlank,
} from '@shared/validators/form.validators';
import { ErrorMessages, firstErrorMessage } from '@shared/validators/validation-messages';
import { formatearPesos } from '../../../application/moneda';
import {
  ActualizarPublicacion,
  CatalogoItem,
  NuevaPublicacion,
  Publicacion,
} from '../../../domain/models/publicacion';

/** Límites de caracteres, los mismos que valida el backend. */
const LIMITES = {
  titulo: 150,
  descripcion: 1000,
  direccionTextual: 250,
  barrioZona: 120,
  reglas: 2000,
} as const;

function crearFormulario(fb: NonNullableFormBuilder) {
  return fb.group({
    titulo: ['', [Validators.required, notBlank(), Validators.maxLength(LIMITES.titulo)]],
    descripcion: ['', [Validators.required, notBlank(), Validators.maxLength(LIMITES.descripcion)]],
    direccionTextual: [
      '',
      [Validators.required, notBlank(), Validators.maxLength(LIMITES.direccionTextual)],
    ],
    idCiudad: fb.control<number | null>(null, Validators.required),
    barrioZona: ['', Validators.maxLength(LIMITES.barrioZona)],
    idTipo: fb.control<number | null>(null, Validators.required),
    // Texto, no number: así el validador puede explicar el error en vez de que el navegador
    // descarte el valor en silencio. Se convierte a número al enviar.
    capacidad: ['', [Validators.required, notBlank(), enteroPositivo()]],
    precioNoche: ['', [Validators.required, notBlank(), decimalPositivo()]],
    // Solo se usan al editar; al crear se deshabilitan y no afectan la validez del formulario.
    tarifaLimpieza: ['0', [Validators.required, notBlank(), decimalNoNegativo()]],
    reglas: ['', Validators.maxLength(LIMITES.reglas)],
  });
}

type FormularioPublicacion = ReturnType<typeof crearFormulario>;
type CampoFormulario = keyof FormularioPublicacion['controls'];
type CampoConContador = keyof typeof LIMITES;

export type ModoFormularioPublicacion = 'crear' | 'editar';

const MENSAJE_CAPACIDAD = 'La capacidad debe ser un número entero mayor que 0';
const MENSAJE_PRECIO = 'El precio por noche debe ser mayor que 0';
const MENSAJE_TARIFA = 'La tarifa de limpieza debe ser un número igual o mayor que 0';

/** Mensajes de la historia, los mismos que devuelve el backend. */
const MENSAJES: Record<CampoFormulario, ErrorMessages> = {
  titulo: {
    required: 'El título es obligatorio',
    blank: 'El título es obligatorio',
    maxlength: `El título admite máximo ${LIMITES.titulo} caracteres`,
  },
  descripcion: {
    required: 'La descripción es obligatoria',
    blank: 'La descripción es obligatoria',
    maxlength: `La descripción admite máximo ${LIMITES.descripcion} caracteres`,
  },
  direccionTextual: {
    required: 'La dirección es obligatoria',
    blank: 'La dirección es obligatoria',
    maxlength: `La dirección admite máximo ${LIMITES.direccionTextual} caracteres`,
  },
  idCiudad: { required: 'La ciudad es obligatoria' },
  barrioZona: { maxlength: `El barrio o zona admite máximo ${LIMITES.barrioZona} caracteres` },
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
  tarifaLimpieza: {
    required: 'La tarifa de limpieza es obligatoria',
    blank: 'La tarifa de limpieza es obligatoria',
    decimalNoNegativo: MENSAJE_TARIFA,
  },
  reglas: { maxlength: `Las reglas admiten máximo ${LIMITES.reglas} caracteres` },
};

/**
 * Formulario de publicación, compartido por "Crear" y "Editar". Solo maneja el formulario y su
 * validación: recibe los catálogos, el estado y (al editar) los valores iniciales por inputs, y
 * emite los datos válidos ya como números.
 *
 * - `crear`: no muestra la tarifa de limpieza ni las reglas (los fija el servidor al crear).
 * - `editar`: precarga `valoresIniciales`, muestra esos dos campos y emite `guardarCambios`.
 */
@Component({
  selector: 'app-publicacion-form',
  imports: [ReactiveFormsModule, IconoAlojamientoComponent],
  templateUrl: './publicacion-form.component.html',
  styleUrl: './publicacion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicacionFormComponent {
  readonly modo = input<ModoFormularioPublicacion>('crear');
  readonly ciudades = input<CatalogoItem[]>([]);
  readonly tipos = input<CatalogoItem[]>([]);
  readonly enviando = input(false);
  /** Solo lectura: se ven los datos, pero no se pueden cambiar ni guardar. */
  readonly soloLectura = input(false);
  /** Publicación que se precarga al editar. Al cambiar, el formulario se vuelve a llenar. */
  readonly valoresIniciales = input<Publicacion | null>(null);
  /** Errores por campo devueltos por el servidor (400 con `errores`). */
  readonly erroresServidor = input<Partial<Record<CampoFormulario, string>>>({});

  readonly guardar = output<NuevaPublicacion>();
  readonly guardarCambios = output<ActualizarPublicacion>();
  readonly cancelar = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form: FormularioPublicacion = crearFormulario(inject(NonNullableFormBuilder));
  protected readonly limites = LIMITES;
  protected readonly esEdicion = computed(() => this.modo() === 'editar');

  constructor() {
    // La tarifa y las reglas solo existen al editar: deshabilitados no cuentan para la validez.
    effect(() => {
      const editar = this.esEdicion();
      const { tarifaLimpieza, reglas } = this.form.controls;
      for (const control of [tarifaLimpieza, reglas]) {
        if (editar) {
          control.enable();
        } else {
          control.disable();
        }
      }
    });

    effect(() => {
      const publicacion = this.valoresIniciales();
      if (publicacion) {
        untracked(() => this.cargarValores(publicacion));
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

  /** ¿Hay cambios sin guardar? Lo usa la página para avisar antes de salir. */
  hayCambios(): boolean {
    return this.form.dirty;
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

  protected contador(campo: CampoConContador): number {
    return this.form.controls[campo].value.length;
  }

  /** Vista previa del precio en pesos colombianos; null mientras el valor no sea válido. */
  protected precioFormateado(): string | null {
    return this.pesos(this.form.controls.precioNoche);
  }

  protected tarifaFormateada(): string | null {
    return this.pesos(this.form.controls.tarifaLimpieza);
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
    if (this.enviando() || this.soloLectura()) {
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
    const datos: NuevaPublicacion = {
      titulo: valor.titulo,
      descripcion: valor.descripcion,
      direccionTextual: valor.direccionTextual,
      idCiudad: valor.idCiudad,
      barrioZona: valor.barrioZona,
      idTipo: valor.idTipo,
      capacidad: Number(valor.capacidad.trim()),
      precioNoche: Number(valor.precioNoche.trim()),
    };

    if (this.esEdicion()) {
      this.guardarCambios.emit({
        ...datos,
        tarifaLimpieza: Number(valor.tarifaLimpieza.trim()),
        reglas: valor.reglas,
      });
    } else {
      this.guardar.emit(datos);
    }
  }

  private pesos(control: { valid: boolean; value: string }): string | null {
    const texto = control.value.trim();
    return control.valid && texto.length > 0 ? formatearPesos(Number(texto)) : null;
  }

  /** Llena el formulario con la publicación y lo deja sin cambios (pristine). */
  private cargarValores(publicacion: Publicacion): void {
    this.form.reset({
      titulo: publicacion.titulo,
      descripcion: publicacion.descripcion,
      direccionTextual: publicacion.direccionTextual,
      idCiudad: publicacion.ciudad.id,
      barrioZona: publicacion.barrioZona ?? '',
      idTipo: publicacion.tipo.id,
      capacidad: String(publicacion.capacidad),
      precioNoche: String(publicacion.precioNoche),
      tarifaLimpieza: String(publicacion.tarifaLimpieza),
      reglas: publicacion.reglas ?? '',
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
