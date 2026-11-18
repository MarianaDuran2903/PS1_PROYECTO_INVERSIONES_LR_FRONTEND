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
 * El texto, ya recortado, debe tener entre `min` y `max` caracteres (los dos incluidos). Se mide el
 * texto recortado porque es el que se envía; un texto vacío o solo de espacios no cumple. El error
 * lleva los límites para armar el mensaje.
 */
export function longitudEntre(min: number, max: number): ValidatorFn {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string') {
      return null;
    }
    const largo = value.trim().length;
    return largo >= min && largo <= max ? null : { longitudEntre: { min, max, actual: largo } };
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

    const { mayuscula, minuscula, numero, especial, espacio, bytes } = analizarContrasena(value);
    if (bytes > PASSWORD_MAX_BYTES) {
      return { passwordBytes: true };
    }
    return mayuscula && minuscula && numero && especial && !espacio
      ? null
      : { passwordStrength: true };
  };
}

/** Qué contiene una contraseña, carácter por carácter. Lo comparten el validador y el checklist. */
export interface ComposicionContrasena {
  mayuscula: boolean;
  minuscula: boolean;
  numero: boolean;
  /** Cualquier carácter que no sea letra, número ni espacio. */
  especial: boolean;
  espacio: boolean;
  /** Largo en bytes UTF-8 (las tildes, la ñ y los símbolos ocupan más de uno). */
  bytes: number;
}

export function analizarContrasena(value: string): ComposicionContrasena {
  const composicion: ComposicionContrasena = {
    mayuscula: false,
    minuscula: false,
    numero: false,
    especial: false,
    espacio: false,
    bytes: new TextEncoder().encode(value).length,
  };
  for (const caracter of value) {
    if (esEspacio(caracter)) {
      composicion.espacio = true;
    } else if (esMayuscula(caracter)) {
      composicion.mayuscula = true;
    } else if (esMinuscula(caracter)) {
      composicion.minuscula = true;
    } else if (esNumero(caracter)) {
      composicion.numero = true;
    } else if (!esLetra(caracter)) {
      composicion.especial = true;
    }
  }
  return composicion;
}

/** Mayor valor que cabe en un `int` de Java: el backend rechazaría un entero más grande. */
const ENTERO_MAXIMO = 2_147_483_647;

const esDigito = (caracter: string) => caracter >= '0' && caracter <= '9';

/**
 * Entero mayor que 0, escrito solo con dígitos (sin signo, decimales ni notación científica).
 * Se recorre el texto carácter por carácter. Vacío es válido: la obligatoriedad la decide
 * `Validators.required`.
 */
export function enteroPositivo(): ValidatorFn {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string') {
      return null;
    }
    const texto = value.trim();
    if (texto.length === 0) {
      return null;
    }
    for (const caracter of texto) {
      if (!esDigito(caracter)) {
        return { enteroPositivo: true };
      }
    }
    const numero = Number(texto);
    return numero > 0 && numero <= ENTERO_MAXIMO ? null : { enteroPositivo: true };
  };
}

/**
 * Valida un número decimal escrito como texto: solo dígitos y un punto con dígitos a ambos lados
 * (sin coma, signo ni notación científica), con un máximo de enteros y de decimales. Vacío es
 * válido: la obligatoriedad la decide `Validators.required`.
 */
function decimalConLimites(
  clave: string,
  permitirCero: boolean,
  maxDecimales: number,
  maxEnteros: number,
): ValidatorFn {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string') {
      return null;
    }
    const texto = value.trim();
    if (texto.length === 0) {
      return null;
    }

    let enteros = '';
    let decimales = '';
    let vistoPunto = false;
    for (const caracter of texto) {
      if (caracter === '.' && !vistoPunto) {
        vistoPunto = true;
      } else if (esDigito(caracter)) {
        if (vistoPunto) {
          decimales += caracter;
        } else {
          enteros += caracter;
        }
      } else {
        return { [clave]: true };
      }
    }

    const formatoValido = enteros.length > 0 && (!vistoPunto || decimales.length > 0);
    const enterosSignificativos = enteros.replace(/^0+/, '').length;
    const hayValor = permitirCero || [...enteros, ...decimales].some((digito) => digito !== '0');
    return formatoValido &&
      hayValor &&
      decimales.length <= maxDecimales &&
      enterosSignificativos <= maxEnteros
      ? null
      : { [clave]: true };
  };
}

/**
 * Número mayor que 0 con punto decimal, de máximo `maxEnteros` dígitos enteros y `maxDecimales`
 * decimales (por defecto 10 y 2, como el backend).
 */
export function decimalPositivo(maxDecimales = 2, maxEnteros = 10): ValidatorFn {
  return decimalConLimites('decimalPositivo', false, maxDecimales, maxEnteros);
}

/** Igual que `decimalPositivo`, pero acepta el cero (p. ej. la tarifa de limpieza). */
export function decimalNoNegativo(maxDecimales = 2, maxEnteros = 10): ValidatorFn {
  return decimalConLimites('decimalNoNegativo', true, maxDecimales, maxEnteros);
}

/** Validador de grupo: los dos campos deben tener el mismo valor. */
export function matchFields(field: string, confirmationField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const value = group.get(field)?.value;
    const confirmation = group.get(confirmationField)?.value;
    return confirmation && value !== confirmation ? { fieldsMismatch: true } : null;
  };
}
