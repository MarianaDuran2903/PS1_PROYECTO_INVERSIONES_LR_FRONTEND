import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EventTrackerService } from '@core/tracking/event-tracker.service';
import {
  EnlaceRecuperacionInvalidoError,
  RestablecimientoInvalidoError,
} from '../domain/errors/recuperacion.errors';
import { ErroresRestablecimiento, RestablecerContrasena } from '../domain/models/recuperacion';
import { AuthRepository } from '../domain/repositories/auth.repository';

export const EVENTO_CONTRASENA_RESTABLECIDA = 'CONTRASENA_RESTABLECIDA';
export const EVENTO_RESTABLECIMIENTO_FALLIDO = 'RESTABLECIMIENTO_FALLIDO';

export const MENSAJE_RESTABLECIMIENTO_EXITOSO =
  'Tu contraseña se actualizó. Ya puedes iniciar sesión con la nueva contraseña';
export const MENSAJE_RESTABLECIMIENTO_FALLIDO =
  'No pudimos cambiar tu contraseña. Inténtalo de nuevo en unos minutos.';

export type EstadoRestablecimiento =
  'inactivo' | 'enviando' | 'exitoso' | 'enlaceInvalido' | 'error';

interface RestablecimientoState {
  estado: EstadoRestablecimiento;
  /** Mensaje de éxito del backend. */
  confirmacion: string | null;
  /** Mensaje del backend cuando el token no sirve (no existe, venció o ya se usó). */
  mensajeEnlace: string | null;
  mensajeError: string | null;
  erroresCampo: ErroresRestablecimiento;
}

const ESTADO_INICIAL: RestablecimientoState = {
  estado: 'inactivo',
  confirmacion: null,
  mensajeEnlace: null,
  mensajeError: null,
  erroresCampo: {},
};

/**
 * Facade / caso de uso "Restablecer contraseña" (RF-USR-004). El token y las contraseñas solo
 * pasan por aquí hacia el repositorio: no se guardan en el estado, ni se registran, ni van a la
 * traza del cliente.
 */
@Injectable()
export class RestablecerContrasenaFacade {
  private readonly repository = inject(AuthRepository);
  private readonly tracker = inject(EventTrackerService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<RestablecimientoState>(ESTADO_INICIAL);

  readonly estado = computed(() => this.state().estado);
  readonly enviando = computed(() => this.state().estado === 'enviando');
  readonly confirmacion = computed(() => this.state().confirmacion);
  readonly mensajeEnlace = computed(() => this.state().mensajeEnlace);
  readonly mensajeError = computed(() => this.state().mensajeError);
  readonly erroresCampo = computed(() => this.state().erroresCampo);

  restablecer(datos: RestablecerContrasena): void {
    if (this.enviando()) {
      return;
    }
    this.state.set({ ...ESTADO_INICIAL, estado: 'enviando' });

    this.repository
      .restablecerContrasena(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (mensaje) => {
          this.state.set({
            ...ESTADO_INICIAL,
            estado: 'exitoso',
            confirmacion: mensaje || MENSAJE_RESTABLECIMIENTO_EXITOSO,
          });
          this.tracker.track(EVENTO_CONTRASENA_RESTABLECIDA);
        },
        error: (error: unknown) => this.alFallar(error),
      });
  }

  private alFallar(error: unknown): void {
    let motivo = 'ERROR';
    let resto: Partial<RestablecimientoState> = {
      estado: 'error',
      mensajeError: MENSAJE_RESTABLECIMIENTO_FALLIDO,
    };

    if (error instanceof EnlaceRecuperacionInvalidoError) {
      motivo = 'ENLACE_INVALIDO';
      resto = { estado: 'enlaceInvalido', mensajeEnlace: error.message };
    } else if (error instanceof RestablecimientoInvalidoError) {
      motivo = 'DATOS_INVALIDOS';
      resto = { estado: 'error', erroresCampo: error.errores };
    }

    this.state.set({ ...ESTADO_INICIAL, ...resto });
    // Solo el motivo: nunca el token ni las contraseñas.
    this.tracker.track(EVENTO_RESTABLECIMIENTO_FALLIDO, { motivo });
  }
}
