import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { EventTrackerService } from '@core/tracking/event-tracker.service';
import { CredencialesInvalidasError } from '../domain/errors/login.errors';
import { Credenciales, Sesion } from '../domain/models/sesion';
import { AuthRepository } from '../domain/repositories/auth.repository';
import { rutaInicialPorRol, urlInternaSegura } from './rutas';
import { SessionService } from './session.service';

export const EVENTO_SESION_INICIADA = 'SESION_INICIADA';
export const EVENTO_INICIO_SESION_FALLIDO = 'INICIO_SESION_FALLIDO';

interface LoginState {
  enviando: boolean;
  mensajeError: string | null;
}

/** Facade / caso de uso "Iniciar sesión" (RF-USR-002). */
@Injectable()
export class LoginFacade {
  private readonly repository = inject(AuthRepository);
  private readonly session = inject(SessionService);
  private readonly tracker = inject(EventTrackerService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<LoginState>({ enviando: false, mensajeError: null });

  readonly enviando = computed(() => this.state().enviando);
  readonly mensajeError = computed(() => this.state().mensajeError);

  iniciarSesion(credenciales: Credenciales, returnUrl?: string | null): void {
    if (this.enviando()) {
      return;
    }
    this.state.set({ enviando: true, mensajeError: null });

    this.repository
      .iniciarSesion(credenciales)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sesion) => this.alIniciar(sesion, returnUrl),
        error: (error: unknown) => this.alFallar(error),
      });
  }

  private alIniciar(sesion: Sesion, returnUrl?: string | null): void {
    this.session.iniciar(sesion);
    this.state.set({ enviando: false, mensajeError: null });
    this.tracker.track(EVENTO_SESION_INICIADA, {
      idUsuario: sesion.usuario.idUsuario,
      roles: sesion.usuario.roles,
    });
    this.toast.success(`¡Hola de nuevo, ${sesion.usuario.primerNombre}!`);

    const destino = urlInternaSegura(returnUrl) ?? rutaInicialPorRol(sesion.usuario.roles);
    void this.router.navigateByUrl(destino);
  }

  private alFallar(error: unknown): void {
    let motivo = 'ERROR';
    let mensaje = 'No fue posible iniciar sesión. Inténtalo de nuevo más tarde.';

    if (error instanceof CredencialesInvalidasError) {
      motivo = 'CREDENCIALES_INVALIDAS';
      mensaje = error.message;
    } else if (error instanceof ApiError) {
      motivo = error.code;
      mensaje = error.message;
    }

    // Sin correo ni contraseña en la traza: solo el motivo.
    this.tracker.track(EVENTO_INICIO_SESION_FALLIDO, { motivo });
    this.state.set({ enviando: false, mensajeError: mensaje });
  }
}
