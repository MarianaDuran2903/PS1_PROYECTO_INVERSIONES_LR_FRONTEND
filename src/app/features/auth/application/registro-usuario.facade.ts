import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { EventTrackerService } from '@core/tracking/event-tracker.service';
import { CorreoYaRegistradoError, RegistroInvalidoError } from '../domain/errors/registro.errors';
import {
  ErroresRegistro,
  RegistroUsuario,
  UsuarioRegistrado,
} from '../domain/models/registro-usuario';
import { AuthRepository } from '../domain/repositories/auth.repository';

export const EVENTO_USUARIO_REGISTRADO = 'USUARIO_REGISTRADO';

export type EstadoRegistro = 'inactivo' | 'enviando' | 'exitoso' | 'error';

interface RegistroState {
  estado: EstadoRegistro;
  usuario: UsuarioRegistrado | null;
  mensajeError: string | null;
  erroresCampo: ErroresRegistro;
}

const ESTADO_INICIAL: RegistroState = {
  estado: 'inactivo',
  usuario: null,
  mensajeError: null,
  erroresCampo: {},
};

/**
 * Facade / caso de uso "Registrar usuario" (Huésped o Anfitrión). Orquesta repositorio,
 * trazabilidad y aviso de bienvenida, y expone el estado como signals de solo lectura para la vista.
 */
@Injectable()
export class RegistroUsuarioFacade {
  private readonly repository = inject(AuthRepository);
  private readonly tracker = inject(EventTrackerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<RegistroState>(ESTADO_INICIAL);

  readonly estado = computed(() => this.state().estado);
  readonly enviando = computed(() => this.state().estado === 'enviando');
  readonly usuario = computed(() => this.state().usuario);
  readonly mensajeError = computed(() => this.state().mensajeError);
  readonly erroresCampo = computed(() => this.state().erroresCampo);

  registrar(datos: RegistroUsuario): void {
    // Evita dobles envíos que podrían intentar crear la cuenta dos veces.
    if (this.enviando()) {
      return;
    }
    this.state.set({ ...ESTADO_INICIAL, estado: 'enviando' });

    this.repository
      .registrarUsuario(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (usuario) => {
          this.state.set({ ...ESTADO_INICIAL, estado: 'exitoso', usuario });
          this.tracker.track(EVENTO_USUARIO_REGISTRADO, {
            idUsuario: usuario.idUsuario,
            roles: usuario.roles,
          });
          this.toast.success(
            `¡Bienvenido, ${usuario.primerNombre}!`,
            'Tu cuenta fue creada correctamente.',
          );
        },
        error: (error: unknown) =>
          this.state.set({ ...ESTADO_INICIAL, ...this.describirError(error) }),
      });
  }

  reiniciar(): void {
    this.state.set(ESTADO_INICIAL);
  }

  private describirError(error: unknown): Omit<RegistroState, 'usuario'> {
    if (error instanceof CorreoYaRegistradoError) {
      const mensaje =
        'Este correo electrónico ya está registrado. Inicia sesión o usa otro correo.';
      return { estado: 'error', mensajeError: mensaje, erroresCampo: { correo: mensaje } };
    }
    if (error instanceof RegistroInvalidoError) {
      return { estado: 'error', mensajeError: error.message, erroresCampo: error.errores };
    }
    if (error instanceof ApiError) {
      return { estado: 'error', mensajeError: error.message, erroresCampo: {} };
    }
    return {
      estado: 'error',
      mensajeError: 'No fue posible completar el registro. Inténtalo de nuevo más tarde.',
      erroresCampo: {},
    };
  }
}
