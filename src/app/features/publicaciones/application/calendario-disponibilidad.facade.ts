import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { CalendarioDisponibilidad } from '../domain/models/calendario-disponibilidad';
import { CalendarioDisponibilidadRepository } from '../domain/repositories/calendario-disponibilidad.repository';

type EstadoCarga = 'cargando' | 'listo' | 'error';

interface CalendarioState {
  estado: EstadoCarga;
  idPublicacion: number | null;
  calendario: CalendarioDisponibilidad | null;
}

const ESTADO_INICIAL: CalendarioState = {
  estado: 'cargando',
  idPublicacion: null,
  calendario: null,
};

@Injectable()
export class CalendarioDisponibilidadFacade {
  private readonly repository = inject(CalendarioDisponibilidadRepository);
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal<CalendarioState>(ESTADO_INICIAL);
  readonly guardando = signal(false);
  readonly errorApertura = signal<string | null>(null);
  readonly errorCierre = signal<string | null>(null);
  private peticion: Subscription | undefined;

  readonly estado = computed(() => this.state().estado);
  readonly calendario = computed(() => this.state().calendario);
  readonly sinPeriodos = computed(
    () => this.state().estado === 'listo' && this.state().calendario?.periodos.length === 0,
  );

  cargar(idPublicacion: number): void {
    this.peticion?.unsubscribe();

    if (!Number.isSafeInteger(idPublicacion) || idPublicacion <= 0) {
      this.state.set({ estado: 'error', idPublicacion: null, calendario: null });
      return;
    }

    this.state.set({ estado: 'cargando', idPublicacion, calendario: null });
    this.peticion = this.repository
      .consultar(idPublicacion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (calendario) => this.state.set({ estado: 'listo', idPublicacion, calendario }),
        error: () =>
          this.state.update((actual) => ({ ...actual, estado: 'error', calendario: null })),
      });
  }

  reintentar(): void {
    const idPublicacion = this.state().idPublicacion;
    if (idPublicacion !== null) {
      this.cargar(idPublicacion);
    }
  }

  cerrarPeriodo(idPeriodo: number): void {
    const idPublicacion = this.state().idPublicacion;
    if (idPublicacion === null || this.guardando()) return;
    this.guardando.set(true);
    this.errorCierre.set(null);
    this.repository
      .cerrar(idPublicacion, idPeriodo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.cargar(idPublicacion);
        },
        error: () => {
          this.guardando.set(false);
          this.errorCierre.set(
            'No se pudo cerrar el periodo. Puede tener una reserva o la publicación estar bloqueada.',
          );
        },
      });
  }

  abrirPeriodo(fechaInicio: string, fechaFin: string): void {
    const idPublicacion = this.state().idPublicacion;
    if (idPublicacion === null || this.guardando()) return;
    this.guardando.set(true);
    this.errorApertura.set(null);
    this.repository
      .abrir(idPublicacion, fechaInicio, fechaFin)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.cargar(idPublicacion);
        },
        error: () => {
          this.guardando.set(false);
          this.errorApertura.set(
            'No se pudo abrir el periodo. Revisa las fechas y que no se crucen con otro periodo.',
          );
        },
      });
  }
}
