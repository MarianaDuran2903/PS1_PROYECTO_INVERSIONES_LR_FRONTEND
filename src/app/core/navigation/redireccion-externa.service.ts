import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/**
 * Lleva a la persona a otro sitio (por ejemplo, la página de pago de la pasarela) saliendo de la
 * aplicación. Solo admite direcciones `https`: nunca se redirige a una URL con otro esquema
 * (`javascript:`, `data:`, etc.) aunque llegue en una respuesta del servidor.
 */
@Injectable({ providedIn: 'root' })
export class RedireccionExterna {
  private readonly ventana = inject(DOCUMENT).defaultView;

  /** Redirige y devuelve `true`, o devuelve `false` sin hacer nada si la URL no es válida. */
  ir(url: string | null | undefined): boolean {
    if (!this.esSegura(url)) {
      return false;
    }
    this.navegar(url);
    return true;
  }

  /** Separado de `ir` para poder sustituirlo en las pruebas: `location` no se puede espiar. */
  protected navegar(url: string): void {
    this.ventana?.location.assign(url);
  }

  private esSegura(url: string | null | undefined): url is string {
    if (!url) {
      return false;
    }
    try {
      return new URL(url).protocol === 'https:';
    } catch {
      return false;
    }
  }
}
