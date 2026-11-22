import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  CatalogoAlojamiento,
  FiltrosBusquedaAlojamientos,
} from '@features/marketplace/domain/models/busqueda-alojamientos';

function fechasCompletas(grupo: AbstractControl): ValidationErrors | null {
  const llegada = grupo.get('fechaLlegada')?.value ?? '';
  const salida = grupo.get('fechaSalida')?.value ?? '';

  return (llegada === '') !== (salida === '') ? { fechasCompletas: true } : null;
}

function salidaPosteriorALlegada(grupo: AbstractControl): ValidationErrors | null {
  const llegada = grupo.get('fechaLlegada')?.value ?? '';
  const salida = grupo.get('fechaSalida')?.value ?? '';

  if (!llegada || !salida) {
    return null;
  }

  return salida <= llegada ? { rangoFechasValido: true } : null;
}

import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-barra-busqueda-alojamientos',
  imports: [ReactiveFormsModule],
  templateUrl: './barra-busqueda-alojamientos.component.html',
  styleUrl: './barra-busqueda-alojamientos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraBusquedaAlojamientosComponent {
  readonly cargando = input(false);
  readonly cargandoCiudades = input(false);
  readonly ciudades = input<CatalogoAlojamiento[]>([]);
  readonly filtrosAplicados = input<FiltrosBusquedaAlojamientos | null>(null);

  readonly buscar = output<FiltrosBusquedaAlojamientos>();
  readonly limpiar = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  readonly formulario = this.fb.group(
    {
      idCiudad: this.fb.control('', {
        validators: [Validators.pattern(/^\d+$/)],
      }),
      fechaLlegada: this.fb.control(''),
      fechaSalida: this.fb.control(''),
      huespedes: this.fb.control('', {
        validators: [Validators.pattern(/^[1-9]\d*$/)],
      }),
    },
    {
      validators: [fechasCompletas, salidaPosteriorALlegada],
    },
  );

  constructor() {
    effect(() => {
      const filtros = this.filtrosAplicados();

      if (!filtros) {
        return;
      }

      this.formulario.patchValue({
        idCiudad: filtros.idCiudad?.toString() ?? '',
        fechaLlegada: filtros.fechaLlegada ?? '',
        fechaSalida: filtros.fechaSalida ?? '',
        huespedes: filtros.huespedes?.toString() ?? '',
      });
    });

    effect(() => {
      const destino = this.formulario.controls.idCiudad;

      if (this.cargandoCiudades()) {
        destino.disable({ emitEvent: false });
      } else {
        destino.enable({ emitEvent: false });
      }
    });
  }

  protected buscarFiltros(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const filtros: FiltrosBusquedaAlojamientos = {};

    if (valores.idCiudad) {
      filtros.idCiudad = Number(valores.idCiudad);
    }

    if (valores.fechaLlegada) {
      filtros.fechaLlegada = valores.fechaLlegada;
    }

    if (valores.fechaSalida) {
      filtros.fechaSalida = valores.fechaSalida;
    }

    if (valores.huespedes) {
      filtros.huespedes = Number(valores.huespedes);
    }

    this.buscar.emit(filtros);
  }

  protected limpiarFiltros(): void {
    this.formulario.reset();
    this.limpiar.emit();
  }
}
