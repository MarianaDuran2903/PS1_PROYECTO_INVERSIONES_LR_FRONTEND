import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';

/** Pantalla que puede tener cambios sin guardar. */
export interface ConCambiosSinGuardar {
  hayCambiosSinGuardar(): boolean;
}

export const MENSAJE_CAMBIOS_SIN_GUARDAR =
  'Tienes cambios sin guardar. ¿Quieres salir sin guardarlos?';

/** Antes de salir de una pantalla con cambios sin guardar, pide confirmación. */
export const cambiosSinGuardarGuard: CanDeactivateFn<ConCambiosSinGuardar> = (pantalla) =>
  !pantalla.hayCambiosSinGuardar() ||
  inject(ConfirmacionService).confirmar(MENSAJE_CAMBIOS_SIN_GUARDAR);
