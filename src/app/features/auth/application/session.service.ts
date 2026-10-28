import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RolUsuario } from '../domain/models/rol-usuario';
import { Sesion, SesionActiva } from '../domain/models/sesion';

export const SESSION_STORAGE_KEY = 'ilr.sesion';

/** setTimeout no admite esperas mayores a 2^31-1 ms (unos 24 días). */
const ESPERA_MAXIMA_MS = 2_147_483_647;

/**
 * Estado de la sesión del usuario. Se guarda en `sessionStorage` junto con su fecha de
 * vencimiento, así sobrevive a recargar la página pero se pierde al cerrar la pestaña.
 * Al vencer el token (no hay renovación) cierra la sesión sola y lleva al login.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly storage = inject(DOCUMENT).defaultView?.sessionStorage;
  private readonly injector = inject(Injector);
  private readonly state = signal<Sesion | null>(this.leer());
  private temporizador: ReturnType<typeof setTimeout> | undefined;

  readonly usuario = computed(() => this.state()?.usuario ?? null);
  readonly token = computed(() => this.state()?.accessToken ?? null);
  readonly autenticado = computed(() => this.state() !== null);

  constructor() {
    this.programarCierre();
  }

  iniciar(sesion: Sesion): void {
    this.state.set(sesion);
    this.guardar(sesion);
    this.programarCierre();
  }

  /** Aplica lo que respondió `GET /auth/sesion`: usuario y rol vigentes, y vencimiento real. */
  actualizar({ usuario, expiraEn }: SesionActiva): void {
    const actual = this.state();
    if (actual) {
      this.iniciar({ ...actual, usuario, expiraEn });
    }
  }

  cerrar(): void {
    clearTimeout(this.temporizador);
    this.state.set(null);
    this.guardar(null);
  }

  /** Sin roles pedidos basta con estar autenticado. */
  tieneAlgunRol(roles: readonly RolUsuario[]): boolean {
    const actuales = this.usuario()?.roles;
    if (!actuales) {
      return false;
    }
    return roles.length === 0 || roles.some((rol) => actuales.includes(rol));
  }

  private programarCierre(): void {
    clearTimeout(this.temporizador);
    const sesion = this.state();
    if (!sesion) {
      return;
    }
    const espera = Math.min(Math.max(sesion.expiraEn - Date.now(), 0), ESPERA_MAXIMA_MS);
    this.temporizador = setTimeout(() => this.alVencerElTemporizador(), espera);
  }

  private alVencerElTemporizador(): void {
    const sesion = this.state();
    if (sesion && Date.now() < sesion.expiraEn) {
      this.programarCierre(); // la espera se recortó al máximo permitido: faltaba tiempo
      return;
    }
    this.cerrar();
    void this.injector.get(Router).navigate(['/login'], { queryParams: { expirada: 'true' } });
  }

  private leer(): Sesion | null {
    try {
      const guardado = this.storage?.getItem(SESSION_STORAGE_KEY);
      const valor: unknown = guardado ? JSON.parse(guardado) : null;
      return esSesion(valor) && valor.expiraEn > Date.now() ? valor : null;
    } catch {
      return null;
    }
  }

  private guardar(sesion: Sesion | null): void {
    try {
      if (sesion) {
        this.storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(sesion));
      } else {
        this.storage?.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Almacenamiento bloqueado (modo privado): la sesión vive solo en memoria.
    }
  }
}

function esSesion(valor: unknown): valor is Sesion {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const { accessToken, expiraEn, usuario } = valor as Partial<Sesion>;
  return (
    typeof accessToken === 'string' &&
    typeof expiraEn === 'number' &&
    typeof usuario === 'object' &&
    usuario !== null &&
    typeof usuario.idUsuario === 'number' &&
    typeof usuario.primerNombre === 'string' &&
    Array.isArray(usuario.roles)
  );
}
