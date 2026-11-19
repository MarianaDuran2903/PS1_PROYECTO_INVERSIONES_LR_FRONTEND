import { HttpErrorResponse } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/http/api-error';
import { Subscription } from 'rxjs';
import { AlojamientoDetalle } from '../domain/models/alojamiento-detalle';
import { BusquedaAlojamientosRepository } from '../domain/repositories/busqueda-alojamientos.repository';

interface DetalleState {
  estado: 'cargando' | 'listo' | 'no-disponible' | 'error';
  alojamiento: AlojamientoDetalle | null;
}

@Injectable()
export class AlojamientoDetalleFacade {
  private readonly repository = inject(BusquedaAlojamientosRepository);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<DetalleState>({
    estado: 'cargando',
    alojamiento: null,
  });

  private peticion?: Subscription;
  private identificador: string | null = null;

  readonly estado = computed(() => this.state().estado);
  readonly alojamiento = computed(() => this.state().alojamiento);

  cargar(identificador: string | null): void {
    this.identificador = identificador;
    this.peticion?.unsubscribe();

    if (
      identificador === null ||
      !/^[1-9]\d*$/.test(identificador) ||
      !Number.isSafeInteger(Number(identificador))
    ) {
      this.state.set({
        estado: 'no-disponible',
        alojamiento: null,
      });
      return;
    }

    this.state.set({
      estado: 'cargando',
      alojamiento: null,
    });

    this.peticion = this.repository
      .obtenerDetalle(Number(identificador))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (alojamiento) => {
          this.state.set({
            estado: 'listo',
            alojamiento,
          });
        },
        error: (error: unknown) => {
          const noDisponible =
            (error instanceof ApiError || error instanceof HttpErrorResponse) &&
            error.status === 404;

          this.state.set({
            estado: noDisponible ? 'no-disponible' : 'error',
            alojamiento: null,
          });
        },
      });
  }

  reintentar(): void {
    this.cargar(this.identificador);
  }
}
