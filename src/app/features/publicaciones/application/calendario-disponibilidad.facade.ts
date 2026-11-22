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
}
