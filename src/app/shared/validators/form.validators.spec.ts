import { FormControl, FormGroup } from '@angular/forms';
import {
  EMAIL_PATTERN,
  matchFields,
  notBlank,
  PERSON_NAME_PATTERN,
  strongPassword,
} from './form.validators';

describe('form.validators', () => {
  describe('notBlank', () => {
    it('rechaza valores con solo espacios', () => {
      expect(notBlank()(new FormControl('   '))).toEqual({ blank: true });
    });

    it('acepta valores vacíos (eso lo valida required) y con texto', () => {
      expect(notBlank()(new FormControl(''))).toBeNull();
      expect(notBlank()(new FormControl(' Ana '))).toBeNull();
    });
  });

  describe('strongPassword', () => {
    it('lista los requisitos que faltan', () => {
      expect(strongPassword()(new FormControl('abcdefgh'))).toEqual({
        passwordStrength: { missing: ['una mayúscula', 'un número', 'un carácter especial'] },
      });
    });

    it('acepta una contraseña robusta', () => {
      expect(strongPassword()(new FormControl('Segura#2026'))).toBeNull();
    });
  });

  describe('matchFields', () => {
    const group = (password: string, confirmation: string) =>
      new FormGroup({
        password: new FormControl(password),
        confirm: new FormControl(confirmation),
      });

    it('marca error cuando no coinciden', () => {
      expect(matchFields('password', 'confirm')(group('Abc#1234', 'Abc#12345'))).toEqual({
        fieldsMismatch: true,
      });
    });

    it('no marca error si coinciden o la confirmación está vacía', () => {
      expect(matchFields('password', 'confirm')(group('Abc#1234', 'Abc#1234'))).toBeNull();
      expect(matchFields('password', 'confirm')(group('Abc#1234', ''))).toBeNull();
    });
  });

  it('PERSON_NAME_PATTERN acepta tildes y ñ, rechaza números', () => {
    expect(PERSON_NAME_PATTERN.test('María José')).toBeTrue();
    expect(PERSON_NAME_PATTERN.test('Peñaloza')).toBeTrue();
    expect(PERSON_NAME_PATTERN.test('Ana2')).toBeFalse();
  });

  it('EMAIL_PATTERN exige dominio con TLD', () => {
    expect(EMAIL_PATTERN.test('ana@correo.com')).toBeTrue();
    expect(EMAIL_PATTERN.test('ana@correo')).toBeFalse();
  });
});
