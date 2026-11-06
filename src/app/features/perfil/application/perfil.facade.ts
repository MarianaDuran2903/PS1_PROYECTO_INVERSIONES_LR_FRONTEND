import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/http/api-error';
import { Perfil } from '../domain/models/perfil';
import { PerfilRepository } from '../domain/repositories/perfil.repository';

interface PerfilState {
  cargando: boolean;
  perfil: Perfil | null;
  error: string | null;
}

@Injectable()
export class PerfilFacade {
  private readonly repository = inject(PerfilRepository);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<PerfilState>({
    cargando: false,
    perfil: null,
    error: null,
  });

  readonly cargando = computed(() => this.state().cargando);
  readonly perfil = computed(() => this.state().perfil);
  readonly error = computed(() => this.state().error);

  cargar(): void {
    if (this.cargando()) {
      return;
    }

    this.state.set({ cargando: true, perfil: null, error: null });

    this.repository
      .consultar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perfil) => {
          this.state.set({ cargando: false, perfil, error: null });
        },
        error: (error: unknown) => {
          this.state.set({
            cargando: false,
            perfil: null,
            error:
              error instanceof ApiError
                ? error.message
                : 'No fue posible consultar tu perfil. Inténtalo de nuevo.',
          });
        },
      });
  }
}
