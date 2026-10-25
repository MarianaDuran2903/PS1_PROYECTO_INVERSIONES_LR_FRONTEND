import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Letras (incluye tildes y ñ), espacios, apóstrofo y guion. */
export const PERSON_NAME_PATTERN = /^[\p{L}][\p{L}' -]*$/u;
/** Correo con dominio y TLD (Validators.email acepta "a@b"). */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

/** Falla si el valor contiene solo espacios. */
export function notBlank(): ValidatorFn {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const value = control.value;
    return typeof value === 'string' && value.length > 0 && value.trim().length === 0
      ? { blank: true }
      : null;
  };
}

/** Exige minúscula, mayúscula, número y carácter especial. */
export function strongPassword(): ValidatorFn {
  const rules: [RegExp, string][] = [
    [/[a-z]/, 'una minúscula'],
    [/[A-Z]/, 'una mayúscula'],
    [/\d/, 'un número'],
    [/[^A-Za-z0-9]/, 'un carácter especial'],
  ];

  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string' || value.length === 0) {
      return null;
    }
    const missing = rules.filter(([regex]) => !regex.test(value)).map(([, label]) => label);
    return missing.length > 0 ? { passwordStrength: { missing } } : null;
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
