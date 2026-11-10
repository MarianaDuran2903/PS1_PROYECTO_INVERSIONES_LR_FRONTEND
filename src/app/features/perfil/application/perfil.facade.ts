import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/http/api-error';
import { ActualizarPerfilRequest, Perfil } from '../domain/models/perfil';
import { PerfilRepository } from '../domain/repositories/perfil.repository';
import { SessionService } from '@features/auth/application/session.service';

interface PerfilState {
  cargando: boolean;
  perfil: Perfil | null;
  error: string | null;
  guardando: boolean;
  guardado: boolean;
  errorGuardado: string | null;
}

@Injectable()
export class PerfilFacade {
  private readonly repository = inject(PerfilRepository);
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(SessionService);

  private readonly state = signal<PerfilState>({
    cargando: false,
    perfil: null,
    error: null,
    guardando: false,
    guardado: false,
    errorGuardado: null,
  });

  readonly cargando = computed(() => this.state().cargando);
  readonly perfil = computed(() => this.state().perfil);
  readonly error = computed(() => this.state().error);
  readonly guardando = computed(() => this.state().guardando);
  readonly guardado = computed(() => this.state().guardado);
  readonly errorGuardado = computed(() => this.state().errorGuardado);

  cargar(): void {
    if (this.cargando()) {
      return;
    }

    this.state.set({
      cargando: true,
      perfil: null,
      error: null,
      guardando: false,
      guardado: false,
      errorGuardado: null,
    });

    this.repository
      .consultar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perfil) => {
          this.state.update((estado) => ({ ...estado, cargando: false, perfil, error: null }));
        },
        error: (error: unknown) => {
          this.state.update((estado) => ({
            ...estado,
            cargando: false,
            perfil: null,
            error:
              error instanceof ApiError
                ? error.message
                : 'No fue posible consultar tu perfil. Inténtalo de nuevo.',
          }));
        },
      });
  }

  actualizar(datos: ActualizarPerfilRequest): void {
    if (this.guardando()) {
      return;
    }

    this.state.update((estado) => ({
      ...estado,
      guardando: true,
      guardado: false,
      errorGuardado: null,
    }));

    this.repository
      .actualizar(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perfil) => {
          this.session.actualizarNombrePerfil({
            idUsuario: perfil.idUsuario,
            primerNombre: perfil.primerNombre,
            primerApellido: perfil.primerApellido,
          });
          this.state.update((estado) => ({
            ...estado,
            guardando: false,
            guardado: true,
            errorGuardado: null,
            perfil,
          }));
        },
        error: (error: unknown) => {
          this.state.update((estado) => ({
            ...estado,
            guardando: false,
            guardado: false,
            errorGuardado:
              error instanceof ApiError
                ? error.message
                : 'No fue posible actualizar tu perfil. Inténtalo de nuevo.',
          }));
        },
      });
  }

  reiniciarGuardado(): void {
    this.state.update((estado) => ({
      ...estado,
      guardado: false,
      errorGuardado: null,
    }));
  }
}
