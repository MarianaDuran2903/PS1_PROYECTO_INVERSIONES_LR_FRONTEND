import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/**
 * Pregunta de sí o no a la persona (p. ej. "¿salir sin guardar?"). Usa el cuadro de confirmación
 * del navegador; se separa en un servicio para poder sustituirlo en las pruebas.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  private readonly ventana = inject(DOCUMENT).defaultView;

  /** true si la persona acepta. Sin ventana (p. ej. render en servidor) no bloquea nada. */
  confirmar(mensaje: string): boolean {
    return this.ventana ? this.ventana.confirm(mensaje) : true;
  }
}
