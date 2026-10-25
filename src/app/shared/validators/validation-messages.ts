import { ValidationErrors } from '@angular/forms';

export type ErrorMessageResolver = (error: unknown) => string;
export type ErrorMessages = Record<string, string | ErrorMessageResolver>;

/** Mensajes por defecto para los errores de validación usados en la app. */
const DEFAULT_MESSAGES: ErrorMessages = {
  required: 'Este campo es obligatorio.',
  blank: 'Este campo no puede estar vacío.',
  email: 'Ingresa un correo electrónico válido.',
  pattern: 'El formato no es válido.',
  minlength: (error) =>
    `Debe tener al menos ${(error as { requiredLength: number }).requiredLength} caracteres.`,
  maxlength: (error) =>
    `Debe tener máximo ${(error as { requiredLength: number }).requiredLength} caracteres.`,
  passwordStrength: (error) =>
    `La contraseña debe incluir ${(error as { missing: string[] }).missing.join(', ')}.`,
  fieldsMismatch: 'Los valores no coinciden.',
  // Mensaje enviado por el servidor para ese campo.
  server: (error) => String(error),
};

/**
 * Devuelve el mensaje del primer error encontrado. `overrides` permite
 * personalizar el mensaje de un campo concreto (p. ej. `pattern` del teléfono).
 */
export function firstErrorMessage(
  errors: ValidationErrors | null | undefined,
  overrides: ErrorMessages = {},
): string | null {
  if (!errors) {
    return null;
  }
  for (const [key, value] of Object.entries(errors)) {
    const message = overrides[key] ?? DEFAULT_MESSAGES[key];
    if (message) {
      return typeof message === 'function' ? message(value) : message;
    }
  }
  return 'El valor no es válido.';
}
