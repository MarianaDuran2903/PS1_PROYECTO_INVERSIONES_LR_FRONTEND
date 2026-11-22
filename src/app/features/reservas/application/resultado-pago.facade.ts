import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RedireccionExterna } from '@core/navigation/redireccion-externa.service';
import { Subscription, timer } from 'rxjs';
import { Pago } from '../domain/models/pago';
import { PagoRepository } from '../domain/repositories/pago.repository';
import {
  clasificarErrorPago,
  ErrorPago,
  MENSAJE_RESERVA_INEXISTENTE,
  MENSAJE_SIN_PAGINA_DE_PAGO,
} from './errores-pago';

/** Cuántas veces se consulta el pago mientras siga `PENDIENTE` (Stripe puede tardar en avisar). */
export const CONSULTAS_MAXIMAS = 10;
/** Espera entre una consulta y la siguiente. */
export const ESPERA_ENTRE_CONSULTAS_MS = 2500;

export type EstadoResultadoPago =
  | 'cargando'
  /** El pago sigue pendiente: se vuelve a consultar solo. */
  | 'procesando'
  /** Se agotaron las consultas y el pago sigue pendiente. */
  | 'sin-confirmacion'
  | 'aprobado'
  | 'rechazado'
  | 'expirado'
  /** La persona volvió de la página de pago sin pagar (`?cancelado=true`). */
  | 'cancelado'
  | 'error';

interface ResultadoState {
  estado: EstadoResultadoPago;
  pago: Pago | null;
  /** Por qué no se pudo consultar el pago (estado `error`). */
  error: ErrorPago | null;
  /** Por qué falló la última acción (reintentar el pago), sin cambiar lo que se muestra. */
  errorAccion: ErrorPago | null;
  /** Se está pidiendo una nueva sesión de pago. */
  reintentando: boolean;
}

const INICIAL: ResultadoState = {
  estado: 'cargando',
  pago: null,
  error: null,
  errorAccion: null,
  reintentando: false,
};

/**
 * Resultado del pago de una reserva. Consulta SIEMPRE el backend al cargar: volver de la página
 * de pago no significa que se haya aprobado, y el estado no se guarda en el front. Mientras el
 * pago siga `PENDIENTE` vuelve a consultar cada 2,5 s, hasta 10 veces; si la persona volvió
 * cancelando no espera ningún resultado y ofrece reintentar.
 */
@Injectable()
export class ResultadoPagoFacade {
  private readonly repository = inject(PagoRepository);
  private readonly redireccion = inject(RedireccionExterna);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<ResultadoState>(INICIAL);
  private consulta?: Subscription;
  private espera?: Subscription;
  private reintento?: Subscription;

  private idReserva: number | null = null;
  private cancelado = false;
  private consultas = 0;

  readonly estado = computed(() => this.state().estado);
  readonly pago = computed(() => this.state().pago);
  readonly error = computed(() => this.state().error);
  readonly errorAccion = computed(() => this.state().errorAccion);
  readonly reintentando = computed(() => this.state().reintentando);

  /**
   * Carga el resultado. `idReserva` es `null` si el identificador no es válido (no se consulta) y
   * `cancelado` indica que la persona volvió de la página de pago sin pagar.
   */
  cargar(idReserva: number | null, cancelado: boolean): void {
    this.detener();
    this.idReserva = idReserva;
    this.cancelado = cancelado;
    this.consultas = 0;

    if (idReserva === null) {
      this.state.set({
        ...INICIAL,
        estado: 'error',
        error: { tipo: 'no-encontrada', mensaje: MENSAJE_RESERVA_INEXISTENTE },
      });
      return;
    }

    this.state.set(INICIAL);
    this.consultar();
  }

  /** Vuelve a consultar el pago cuando se agotaron las consultas automáticas. */
  reintentarConsulta(): void {
    if (this.idReserva === null) {
      return;
    }
    this.detener();
    this.consultas = 0;
    this.state.update((actual) => ({ ...actual, estado: 'procesando', errorAccion: null }));
    this.consultar();
  }

  /**
   * Lleva a la página de pago de la sesión vigente ("Intentar con otra tarjeta" o reintentar
   * tras cancelar). Si ya no hay una URL utilizable, pide una sesión nueva.
   */
  irAPago(): void {
    if (!this.redireccion.ir(this.pago()?.urlPago)) {
      this.reintentarPago();
    }
  }

  /** Pide una sesión de pago nueva (`POST`) y, si la obtiene, lleva a la persona a ella. */
  reintentarPago(): void {
    const idReserva = this.idReserva;
    if (idReserva === null || this.reintentando()) {
      return;
    }

    this.reintento?.unsubscribe();
    this.state.update((actual) => ({ ...actual, reintentando: true, errorAccion: null }));

    this.reintento = this.repository
      .iniciar(idReserva)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pago) => {
          if (this.redireccion.ir(pago.urlPago)) {
            return; // la página se cierra al redirigir: se deja "reintentando" hasta entonces
          }
          this.fallarAccion({ tipo: 'otro', mensaje: MENSAJE_SIN_PAGINA_DE_PAGO });
        },
        error: (error: unknown) => {
          const falla = clasificarErrorPago(error);
          this.fallarAccion(falla);
          if (falla.tipo === 'ya-pagada') {
            // El pago se aprobó entretanto: se muestra el resultado real.
            this.cargar(idReserva, this.cancelado);
          }
        },
      });
  }

  private consultar(): void {
    const idReserva = this.idReserva;
    if (idReserva === null) {
      return;
    }

    this.consulta = this.repository
      .consultar(idReserva)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pago) => this.alRecibir(pago),
        error: (error: unknown) =>
          this.state.update((actual) => ({
            ...actual,
            estado: 'error',
            error: clasificarErrorPago(error),
          })),
      });
  }

  private alRecibir(pago: Pago): void {
    switch (pago.estado) {
      case 'APROBADO':
        return this.mostrar('aprobado', pago);
      case 'RECHAZADO':
        return this.mostrar('rechazado', pago);
      case 'EXPIRADO':
        return this.mostrar('expirado', pago);
      case 'PENDIENTE':
        return this.alEstarPendiente(pago);
    }
  }

  private alEstarPendiente(pago: Pago): void {
    if (this.cancelado) {
      // Volvió sin pagar: no hay resultado que esperar.
      return this.mostrar('cancelado', pago);
    }

    this.consultas++;
    if (this.consultas >= CONSULTAS_MAXIMAS) {
      return this.mostrar('sin-confirmacion', pago);
    }

    this.mostrar('procesando', pago);
    this.espera = timer(ESPERA_ENTRE_CONSULTAS_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.consultar());
  }

  private mostrar(estado: EstadoResultadoPago, pago: Pago): void {
    this.state.update((actual) => ({ ...actual, estado, pago, error: null }));
  }

  private fallarAccion(errorAccion: ErrorPago): void {
    this.state.update((actual) => ({ ...actual, reintentando: false, errorAccion }));
  }

  private detener(): void {
    this.consulta?.unsubscribe();
    this.espera?.unsubscribe();
    this.reintento?.unsubscribe();
  }
}
