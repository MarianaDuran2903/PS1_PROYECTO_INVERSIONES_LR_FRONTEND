import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ToastService } from '@core/notifications/toast.service';
import { leerIdPublicacion } from '@features/publicaciones/application/id-publicacion';
import { PublicacionNoEncontradaError } from '@features/publicaciones/domain/errors/publicacion.errors';
import { Publicacion } from '@features/publicaciones/domain/models/publicacion';
import { PublicacionAdminRepository } from '../domain/repositories/publicacion-admin.repository';

export type EstadoDetalleAdmin = 'cargando' | 'listo' | 'error';

const RUTA_GESTION = ['/admin', 'publicaciones'];

/**
 * Facade / caso de uso "Ver el detalle de una publicación" (Administrador). Carga cualquier
 * publicación por su número, con el motivo del bloqueo si lo tiene.
 * - 404 (o un id que no es un número): avisa "La publicación no existe" y vuelve a la gestión.
 * - Error de red o 500: deja el estado en "error" para poder reintentar.
 * - 401 y 403: los resuelve el interceptor.
 */
@Injectable()
export class DetallePublicacionAdminFacade {
  private readonly repository = inject(PublicacionAdminRepository);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly estadoCarga = signal<EstadoDetalleAdmin>('cargando');
  private readonly datos = signal<Publicacion | null>(null);

  readonly estado = this.estadoCarga.asReadonly();
  readonly publicacion = computed(() => this.datos());

  /** Carga la publicación con el id de la URL. Sirve también para "Reintentar" y para recargar. */
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
        error: (error: unknown) => {
          if (error instanceof PublicacionNoEncontradaError) {
            this.noExiste();
          } else {
            this.estadoCarga.set('error');
          }
        },
      });
  }

  private noExiste(): void {
    this.toast.error('La publicación no existe');
    void this.router.navigate(RUTA_GESTION);
  }
}
