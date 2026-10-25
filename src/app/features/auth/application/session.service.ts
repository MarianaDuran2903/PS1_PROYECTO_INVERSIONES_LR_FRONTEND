import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { RolUsuario } from '../domain/models/rol-usuario';
import { Sesion } from '../domain/models/sesion';

export const SESSION_STORAGE_KEY = 'ilr.sesion';

/**
 * Estado de la sesión del usuario. Se guarda en `sessionStorage`, así sobrevive a recargar
 * la página pero se pierde al cerrar la pestaña. Si el backend pasa a usar cookies
 * HttpOnly, solo cambia `leer`/`guardar` y el interceptor; el resto no se entera.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly storage = inject(DOCUMENT).defaultView?.sessionStorage;
  private readonly state = signal<Sesion | null>(this.leer());

  readonly usuario = computed(() => this.state()?.usuario ?? null);
  readonly token = computed(() => this.state()?.accessToken ?? null);
  readonly autenticado = computed(() => this.state() !== null);

  iniciar(sesion: Sesion): void {
    this.state.set(sesion);
    this.guardar(sesion);
  }

  cerrar(): void {
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

  private leer(): Sesion | null {
    try {
      const guardado = this.storage?.getItem(SESSION_STORAGE_KEY);
      const valor: unknown = guardado ? JSON.parse(guardado) : null;
      return esSesion(valor) ? valor : null;
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
  const { accessToken, usuario } = valor as Partial<Sesion>;
  return (
    typeof accessToken === 'string' &&
    typeof usuario === 'object' &&
    usuario !== null &&
    typeof usuario.idUsuario === 'number' &&
    typeof usuario.primerNombre === 'string' &&
    Array.isArray(usuario.roles)
  );
}
