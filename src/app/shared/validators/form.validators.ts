import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Correo con dominio y TLD (Validators.email acepta "a@b"). Sin grupos repetidos. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PERSON_NAME_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
/** Límite de bcrypt: el backend rechaza contraseñas de más de 72 bytes en UTF-8. */
export const PASSWORD_MAX_BYTES = 72;

const SEPARADORES_NOMBRE: ReadonlySet<string> = new Set([' ', '-', "'"]);

const esLetra = (caracter: string) => /\p{L}/u.test(caracter);
const esMayuscula = (caracter: string) => /\p{Lu}/u.test(caracter);
const esMinuscula = (caracter: string) => /\p{Ll}/u.test(caracter);
const esNumero = (caracter: string) => /\p{Nd}/u.test(caracter);
const esEspacio = (caracter: string) => /\s/u.test(caracter);

/** Falla si el valor contiene solo espacios. */
export function notBlank(): ValidatorFn {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const value = control.value;
    return typeof value === 'string' && value.length > 0 && value.trim().length === 0
      ? { blank: true }
      : null;
  };
}

/**
 * Nombre o apellido: letras (con tildes y ñ) separadas por UN espacio, guion o apóstrofe, sin
 * separador al inicio ni al final. Se recorre carácter por carácter, igual que el backend, para
 * evitar expresiones regulares con grupos repetidos. Se evalúa el texto ya recortado, que es el
 * que se envía; vacío es válido (la obligatoriedad la decide `Validators.required`).
 */
export function personName(): ValidatorFn {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string') {
      return null;
    }
    const texto = value.trim();
    if (texto.length === 0) {
      return null;
    }

    let anteriorEsSeparador = true; // el primer carácter no puede ser separador
    for (const caracter of texto) {
      if (SEPARADORES_NOMBRE.has(caracter)) {
        if (anteriorEsSeparador) {
          return { personName: true };
        }
        anteriorEsSeparador = true;
      } else if (esLetra(caracter)) {
        anteriorEsSeparador = false;
      } else {
        return { personName: true };
      }
    }
    return anteriorEsSeparador ? { personName: true } : null;
  };
}

/**
 * Contraseña segura: al menos una mayúscula, una minúscula, un número y un carácter especial
 * (cualquiera que no sea letra, número ni espacio), sin espacios, y máximo 72 bytes en UTF-8.
 * El largo (8 a 64) lo validan `Validators.minLength/maxLength`.
 */
export function strongPassword(): ValidatorFn {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string' || value.length === 0) {
      return null;
    }

    let mayuscula = false;
    let minuscula = false;
    let numero = false;
    let especial = false;
    let espacio = false;
    for (const caracter of value) {
      if (esEspacio(caracter)) {
        espacio = true;
      } else if (esMayuscula(caracter)) {
        mayuscula = true;
      } else if (esMinuscula(caracter)) {
        minuscula = true;
      } else if (esNumero(caracter)) {
        numero = true;
      } else if (!esLetra(caracter)) {
        especial = true;
      }
    }

    if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
      return { passwordBytes: true };
    }
    return mayuscula && minuscula && numero && especial && !espacio
      ? null
      : { passwordStrength: true };
  };
}

/** Validador de grupo: los dos campos deben tener el mismo valor. */
export function matchFields(field: string, confirmationField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const value = group.get(field)?.value;
    const confirmation = group.get(confirmationField)?.value;
    return confirmation && value !== confirmation ? { fieldsMismatch: true } : null;
  };
}
