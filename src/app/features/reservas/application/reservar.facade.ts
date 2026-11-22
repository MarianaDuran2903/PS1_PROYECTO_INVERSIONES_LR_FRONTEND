import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, Subscription } from 'rxjs';
import { Reserva, SolicitudReserva } from '../domain/models/reserva';
import { ReservaRepository } from '../domain/repositories/reserva.repository';
import { generarClaveIdempotencia } from './clave-idempotencia';
import { clasificarErrorReserva, ErrorReserva, esFalloIncierto } from './errores-reserva';

export type EstadoReservar = 'inactiva' | 'reservando' | 'error';

interface ReservarState {
  estado: EstadoReservar;
  error: ErrorReserva | null;
}

const INICIAL: ReservarState = { estado: 'inactiva', error: null };

/** Identifica una solicitud: la misma clave de idempotencia solo vale para los mismos datos. */
function huellaDe(solicitud: SolicitudReserva): string {
  return [
    solicitud.idPublicacion,
    solicitud.fechaLlegada,
    solicitud.fechaSalida,
    solicitud.huespedes,
  ].join('|');
}

/**
 * Crea la reserva (`POST /reservas`) de lo que se cotizó. Cada intento lleva su clave de
 * idempotencia: si la respuesta no llegó (corte de red o fallo del servidor) y la persona
 * reintenta con los mismos datos, se reutiliza la misma clave para no crear dos reservas; tras
 * cualquier respuesta definitiva, o con otros datos, se usa una clave nueva. Al crearla, emite la
 * reserva por `reservaCreada$` para que quien lo usa lleve a pagar.
 */
@Injectable()
export class ReservarFacade {
  private readonly repository = inject(ReservaRepository);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<ReservarState>(INICIAL);
  private peticion?: Subscription;
  private intento?: { clave: string; huella: string };

  private readonly reservaCreadaSubject = new Subject<Reserva>();
  /** Emite la reserva cuando el backend la crea (o devuelve la que ya había con esa clave). */
  readonly reservaCreada$ = this.reservaCreadaSubject.asObservable();

  readonly estado = computed(() => this.state().estado);
  readonly error = computed(() => this.state().error);
  readonly reservando = computed(() => this.state().estado === 'reservando');

  reservar(solicitud: SolicitudReserva): void {
    if (this.reservando()) {
      return;
    }

    const huella = huellaDe(solicitud);
    const intento =
      this.intento?.huella === huella
        ? this.intento
        : { clave: generarClaveIdempotencia(), huella };
    this.intento = intento;

    this.peticion?.unsubscribe();
    this.state.set({ estado: 'reservando', error: null });

    this.peticion = this.repository
      .crear(solicitud, intento.clave)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reserva) => {
          this.intento = undefined;
          this.state.set(INICIAL);
          this.reservaCreadaSubject.next(reserva);
        },
        error: (error: unknown) => {
          if (!esFalloIncierto(error)) {
            this.intento = undefined;
          }
          this.state.set({ estado: 'error', error: clasificarErrorReserva(error) });
        },
      });
  }

  /** Quita el aviso de error (por ejemplo, cuando cambian los datos). */
  limpiar(): void {
    this.peticion?.unsubscribe();
    this.state.set(INICIAL);
  }
}
