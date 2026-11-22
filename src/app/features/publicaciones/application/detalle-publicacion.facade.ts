import { DestroyRef, computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ToastService } from '@core/notifications/toast.service';
import {
  PublicacionAjenaError,
  PublicacionNoEncontradaError,
} from '../domain/errors/publicacion.errors';
import { Publicacion } from '../domain/models/publicacion';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';
import { leerIdPublicacion } from './id-publicacion';

export type EstadoDetalle = 'cargando' | 'listo' | 'error';

const RUTA_LISTADO = ['/anfitrion', 'publicaciones'];

/**
 * Facade / caso de uso "Ver el detalle de una publicación propia" (Anfitrión).
 * - 403 (de otro Anfitrión) y 404: avisa y vuelve al listado "Mis publicaciones".
 * - Error de red o 500: deja el estado en "error" para poder reintentar.
 * - 401: lo resuelve el interceptor (cierra sesión y lleva al login).
 */
@Injectable()
export class DetallePublicacionFacade {
  private readonly repository = inject(PublicacionRepository);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly estadoCarga = signal<EstadoDetalle>('cargando');
  private readonly datos = signal<Publicacion | null>(null);

  readonly estado = this.estadoCarga.asReadonly();
  readonly publicacion = computed(() => this.datos());

  /** Carga la publicación con el id de la URL. Sirve también para "Reintentar". */
  cargar(idTexto: string | undefined): void {
    const id = leerIdPublicacion(idTexto);
    if (id === null) {
      this.noExiste();
      return;
    }
    this.estadoCarga.set('cargando');

    this.repository
      .obtener(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (publicacion) => {
          this.datos.set(publicacion);
          this.estadoCarga.set('listo');
        },
        error: (error: unknown) => this.alFallar(error),
      });
  }

  private alFallar(error: unknown): void {
    if (error instanceof PublicacionNoEncontradaError) {
      this.noExiste();
    } else if (error instanceof PublicacionAjenaError) {
      this.toast.error('No puedes ver esta publicación');
      void this.router.navigate(RUTA_LISTADO);
    } else {
      this.estadoCarga.set('error');
    }
  }

  private noExiste(): void {
    this.toast.error('La publicación no existe');
    void this.router.navigate(RUTA_LISTADO);
  }
}
