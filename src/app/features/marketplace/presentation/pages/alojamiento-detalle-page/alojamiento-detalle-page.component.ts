import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AlojamientoDetalleFacade } from '../../../application/alojamiento-detalle.facade';
import { leerContextoBusqueda, parametrosBusqueda } from '../../../application/contexto-busqueda';

function fechaLocalActual(): string {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function fechaEnMilisegundos(valor: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null;
  }

  const fecha = new Date(`${valor}T00:00:00.000Z`);
  const tiempo = fecha.getTime();

  if (!Number.isFinite(tiempo) || fecha.toISOString().slice(0, 10) !== valor) {
    return null;
  }

  return tiempo;
}

function validarFechas(grupo: AbstractControl): ValidationErrors | null {
  const llegada = grupo.get('fechaLlegada')?.value as string;
  const salida = grupo.get('fechaSalida')?.value as string;

  if (!llegada || !salida) {
    return null;
  }

  const inicio = fechaEnMilisegundos(llegada);
  const fin = fechaEnMilisegundos(salida);

  if (inicio === null || fin === null) {
    return { fechasInvalidas: true };
  }

  if (llegada < fechaLocalActual()) {
    return { llegadaPasada: true };
  }

  return fin <= inicio ? { rangoFechas: true } : null;
}

@Component({
  selector: 'app-alojamiento-detalle-page',
  imports: [CurrencyPipe, RouterLink, ReactiveFormsModule],
  providers: [AlojamientoDetalleFacade],
  templateUrl: './alojamiento-detalle-page.component.html',
  styleUrl: './alojamiento-detalle-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlojamientoDetallePageComponent {
  protected readonly facade = inject(AlojamientoDetalleFacade);

  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly hoy = fechaLocalActual();

  protected readonly estancia = this.fb.group(
    {
      fechaLlegada: ['', Validators.required],
      fechaSalida: ['', Validators.required],
      huespedes: [1, [Validators.required, Validators.min(1), Validators.pattern(/^[1-9]\d*$/)]],
    },
    { validators: validarFechas },
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.facade.cargar(params.get('idPublicacion'));
    });

    effect(() => {
      const alojamiento = this.facade.alojamiento();

      if (!alojamiento) {
        return;
      }

      const contexto = leerContextoBusqueda(this.route.snapshot.queryParamMap);

      this.estancia.controls.huespedes.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(alojamiento.capacidad),
        Validators.pattern(/^[1-9]\d*$/),
      ]);

      this.estancia.reset({
        fechaLlegada: contexto.filtros.fechaLlegada ?? '',
        fechaSalida: contexto.filtros.fechaSalida ?? '',
        huespedes: contexto.filtros.huespedes ?? 1,
      });
    });
  }

  protected parametrosRegreso() {
    const contexto = leerContextoBusqueda(this.route.snapshot.queryParamMap);

    return parametrosBusqueda(contexto.pagina, contexto.filtros);
  }

  protected noches(): number {
    if (this.estancia.invalid) {
      return 0;
    }

    const inicio = fechaEnMilisegundos(this.estancia.controls.fechaLlegada.value);
    const fin = fechaEnMilisegundos(this.estancia.controls.fechaSalida.value);

    if (inicio === null || fin === null || fin <= inicio) {
      return 0;
    }

    return (fin - inicio) / 86_400_000;
  }

  protected salidaMinima(): string {
    const inicio = fechaEnMilisegundos(this.estancia.controls.fechaLlegada.value);

    if (inicio === null) {
      return this.hoy;
    }

    const siguienteDia = new Date(inicio + 86_400_000).toISOString().slice(0, 10);

    return siguienteDia > this.hoy ? siguienteDia : this.hoy;
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

  protected ocultarImagen(evento: Event): void {
    const imagen = evento.target as HTMLImageElement;
    imagen.hidden = true;
  }
}
