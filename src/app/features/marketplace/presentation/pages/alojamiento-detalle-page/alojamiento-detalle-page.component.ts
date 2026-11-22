import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '@features/auth/application/session.service';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { debounceTime } from 'rxjs';
import { AlojamientoDetalleFacade } from '../../../application/alojamiento-detalle.facade';
import { leerContextoBusqueda, parametrosBusqueda } from '../../../application/contexto-busqueda';
import { CotizacionFacade } from '../../../application/cotizacion.facade';
import { SolicitudCotizacion } from '../../../domain/models/cotizacion';
import { SolicitudReserva } from '@features/reservas/domain/models/reserva';
import { AccionReservarComponent } from '@features/reservas/presentation/components/accion-reservar/accion-reservar.component';
import { DesgloseCotizacionComponent } from '../../components/desglose-cotizacion/desglose-cotizacion.component';

/** Espera tras el último cambio de fechas o huéspedes antes de volver a cotizar. */
export const ESPERA_RECOTIZACION_MS = 400;

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
  imports: [
    CurrencyPipe,
    RouterLink,
    ReactiveFormsModule,
    DesgloseCotizacionComponent,
    AccionReservarComponent,
  ],
  providers: [AlojamientoDetalleFacade, CotizacionFacade],
  templateUrl: './alojamiento-detalle-page.component.html',
  styleUrl: './alojamiento-detalle-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlojamientoDetallePageComponent {
  protected readonly facade = inject(AlojamientoDetalleFacade);
  protected readonly cotizacion = inject(CotizacionFacade);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly autenticado = this.session.autenticado;
  /** Solo el Huésped puede cotizar; un Visitante debe iniciar sesión primero. */
  protected readonly puedeCotizar = computed(() =>
    this.session.tieneAlgunRol([RolUsuario.Huesped]),
  );
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

    // Una vez pedida la primera cotización, cualquier cambio de la estancia la actualiza.
    this.estancia.valueChanges
      .pipe(debounceTime(ESPERA_RECOTIZACION_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cotizacion.alCambiar(this.solicitudActual()));

    effect(() => {
      const alojamiento = this.facade.alojamiento();

      // Otro alojamiento: lo cotizado antes ya no corresponde.
      untracked(() => this.cotizacion.reiniciar());

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

  /** Lo que muestra la cotización, para reservar exactamente eso (los huéspedes son obligatorios). */
  protected readonly solicitudReserva = computed<SolicitudReserva | null>(() => {
    const cotizada = this.cotizacion.solicitudCotizada();

    return cotizada && cotizada.huespedes !== undefined
      ? {
          idPublicacion: cotizada.idPublicacion,
          fechaLlegada: cotizada.fechaLlegada,
          fechaSalida: cotizada.fechaSalida,
          huespedes: cotizada.huespedes,
        }
      : null;
  });

  /** Otra persona tomó las fechas mientras se miraba la cotización: se vuelve a cotizar. */
  protected alOcuparseLasFechas(): void {
    const solicitud = this.cotizacion.solicitudCotizada();

    if (solicitud) {
      this.cotizacion.cotizar(solicitud);
    }
  }

  /** El Huésped pidió cotizar. Con datos inválidos solo se muestran los errores del formulario. */
  protected cotizar(): void {
    this.estancia.markAllAsTouched();

    const solicitud = this.solicitudActual();
    if (solicitud !== null) {
      this.cotizacion.cotizar(solicitud);
    }
  }

  /** Datos de la estancia listos para cotizar, o `null` si el formulario no es válido. */
  private solicitudActual(): SolicitudCotizacion | null {
    const alojamiento = this.facade.alojamiento();

    if (!alojamiento || this.estancia.invalid) {
      return null;
    }

    const { fechaLlegada, fechaSalida, huespedes } = this.estancia.getRawValue();

    return {
      idPublicacion: alojamiento.idPublicacion,
      fechaLlegada,
      fechaSalida,
      huespedes,
    };
  }

  /** Dirección actual, para volver aquí después de iniciar sesión. */
  protected urlActual(): string {
    return this.router.url;
  }

  /** Enlaza el mensaje del servidor de un campo con su `input`, además de los errores locales. */
  protected descritoPor(
    idError: string,
    campo: 'fechaLlegada' | 'fechaSalida' | 'huespedes',
  ): string {
    return this.cotizacion.errores()[campo] ? `${idError} estancia-errores` : 'estancia-errores';
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
