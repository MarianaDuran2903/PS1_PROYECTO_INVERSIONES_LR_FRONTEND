import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BusquedaAlojamientosFacade } from '../../../application/busqueda-alojamientos.facade';
import { FiltrosBusquedaAlojamientos } from '../../../domain/models/busqueda-alojamientos';
import { BarraBusquedaAlojamientosComponent } from '@shared/ui/barra-busqueda-alojamientos/barra-busqueda-alojamientos.component';
import {
  leerContextoBusqueda,
  parametrosBusqueda,
} from '@features/marketplace/application/contexto-busqueda';

function rangoPreciosValido(grupo: AbstractControl): ValidationErrors | null {
  const minimo = grupo.get('precioMinimo')?.value as string;
  const maximo = grupo.get('precioMaximo')?.value as string;

  if (!minimo || !maximo) {
    return null;
  }

  return Number(maximo) < Number(minimo) ? { rangoPrecios: true } : null;
}

@Component({
  selector: 'app-busqueda-alojamientos-page',
  imports: [CurrencyPipe, ReactiveFormsModule, BarraBusquedaAlojamientosComponent, RouterLink],
  providers: [BusquedaAlojamientosFacade],
  templateUrl: './busqueda-alojamientos-page.component.html',
  styleUrl: './busqueda-alojamientos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusquedaAlojamientosPageComponent {
  protected readonly facade = inject(BusquedaAlojamientosFacade);

  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly caracteristicas = this.fb.group(
    {
      idTipo: this.fb.control('', {
        validators: [Validators.pattern(/^[1-9]\d*$/)],
      }),
      precioMinimo: this.fb.control('', {
        validators: [Validators.pattern(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/)],
      }),
      precioMaximo: this.fb.control('', {
        validators: [Validators.pattern(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/)],
      }),
      idsServicios: this.fb.control<number[]>([]),
    },
    { validators: rangoPreciosValido },
  );

  constructor() {
    effect(() => {
      const filtros = this.facade.filtrosAplicados();

      this.caracteristicas.reset(
        {
          idTipo: filtros.idTipo?.toString() ?? '',
          precioMinimo: filtros.precioMinimo?.toString() ?? '',
          precioMaximo: filtros.precioMaximo?.toString() ?? '',
          idsServicios: [...(filtros.idsServicios ?? [])],
        },
        { emitEvent: false },
      );
    });

    const contexto = leerContextoBusqueda(this.route.snapshot.queryParamMap);

    this.facade.cargar(contexto.pagina, contexto.filtros);
    this.facade.cargarCiudades();
    this.facade.cargarCaracteristicas();
  }

  protected buscar(filtros: FiltrosBusquedaAlojamientos): void {
    const combinados = { ...this.facade.filtrosAplicados() };

    delete combinados.idCiudad;
    delete combinados.fechaLlegada;
    delete combinados.fechaSalida;
    delete combinados.huespedes;

    this.facade.cargar(0, { ...combinados, ...filtros });
  }

  protected aplicarCaracteristicas(): void {
    if (this.caracteristicas.invalid) {
      this.caracteristicas.markAllAsTouched();
      return;
    }

    const valores = this.caracteristicas.getRawValue();
    const filtros = this.sinCaracteristicas();

    if (valores.idTipo) {
      filtros.idTipo = Number(valores.idTipo);
    }

    if (valores.precioMinimo !== '') {
      filtros.precioMinimo = Number(valores.precioMinimo);
    }

    if (valores.precioMaximo !== '') {
      filtros.precioMaximo = Number(valores.precioMaximo);
    }

    if (valores.idsServicios.length > 0) {
      filtros.idsServicios = [...valores.idsServicios];
    }

    this.facade.cargar(0, filtros);
  }

  protected cambiarServicio(idServicio: number, evento: Event): void {
    const seleccionado = (evento.target as HTMLInputElement).checked;
    const control = this.caracteristicas.controls.idsServicios;

    control.setValue(
      seleccionado
        ? [...new Set([...control.value, idServicio])]
        : control.value.filter((id) => id !== idServicio),
    );

    control.markAsDirty();
  }

  protected limpiarCaracteristicas(): void {
    this.caracteristicas.reset();
    this.facade.cargar(0, this.sinCaracteristicas());
  }

  protected limpiar(): void {
    this.caracteristicas.reset();
    this.facade.cargar(0, {});
  }

  protected imagenReferencia(tipo: string): string {
    switch (tipo) {
      case 'Apartamento':
        return '/img/imgApartamentos.png';
      case 'Casa':
        return '/img/imgCasas.jpg';
      case 'Cabaña':
        return '/img/imgCaba%C3%B1a.jpg';
      case 'Habitación':
        return '/img/imgHabitaciones.jpg';
      default:
        return '/img/imgHero.jpg';
    }
  }

  protected usarImagenAlternativa(evento: Event): void {
    const imagen = evento.target as HTMLImageElement;

    if (imagen.getAttribute('src') === '/img/imgHero.jpg') {
      imagen.hidden = true;
      return;
    }

    imagen.src = '/img/imgHero.jpg';
  }

  private sinCaracteristicas(): FiltrosBusquedaAlojamientos {
    const filtros = { ...this.facade.filtrosAplicados() };

    delete filtros.idTipo;
    delete filtros.precioMinimo;
    delete filtros.precioMaximo;
    delete filtros.idsServicios;

    return filtros;
  }

  protected parametrosDetalle() {
    return parametrosBusqueda(this.facade.paginaActual(), this.facade.filtrosAplicados());
  }
}
