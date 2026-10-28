import { FormControl, FormGroup } from '@angular/forms';
import {
  EMAIL_PATTERN,
  matchFields,
  notBlank,
  personName,
  strongPassword,
} from './form.validators';
import { firstErrorMessage } from './validation-messages';

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

  describe('personName', () => {
    const validar = (valor: unknown) => personName()(new FormControl(valor));

    for (const valor of ['María José', 'Ana-Lucía', "D'Angelo", 'Núñez', 'Ana', ' Ana ']) {
      it(`acepta "${valor}"`, () => {
        expect(validar(valor)).toBeNull();
      });
    }

    for (const valor of ['Ana2', '-Ana', 'Ana-', 'Ana--Lucía', 'Ana  María', "Ana'-Lía", 'Ana_']) {
      it(`rechaza "${valor}"`, () => {
        expect(validar(valor)).toEqual({ personName: true });
      });
    }

    it('trata el vacío y los espacios sueltos como válidos (eso lo validan required y notBlank)', () => {
      expect(validar('')).toBeNull();
      expect(validar('   ')).toBeNull();
      expect(validar(null)).toBeNull();
    });

    it('responde con el mensaje del backend', () => {
      expect(firstErrorMessage({ personName: true })).toBe(
        'Solo se permiten letras, espacios, guion o apóstrofe',
      );
    });
  });

  describe('strongPassword', () => {
    const validar = (valor: unknown) => strongPassword()(new FormControl(valor));

    it('acepta una contraseña con mayúscula, minúscula, número y carácter especial', () => {
      expect(validar('Segura#123')).toBeNull();
      expect(validar('Clave_ñandú9')).toBeNull();
    });

    for (const valor of ['segura#123', 'SEGURA#123', 'Segura#abc', 'Segura1234', 'Segu ra#12']) {
      it(`rechaza "${valor}"`, () => {
        expect(validar(valor)).toEqual({ passwordStrength: true });
      });
    }

    it('rechaza más de 72 bytes en UTF-8 aunque tenga menos de 64 caracteres', () => {
      const conTildes = 'Á1#a' + 'ñ'.repeat(40); // 44 caracteres, 85 bytes
      expect(conTildes.length).toBeLessThan(64);
      expect(validar(conTildes)).toEqual({ passwordBytes: true });
    });

    it('ignora el valor vacío (eso lo valida required)', () => {
      expect(validar('')).toBeNull();
    });

    it('responde con los mensajes del backend', () => {
      expect(firstErrorMessage({ passwordStrength: true })).toBe(
        'La contraseña debe tener al menos una mayúscula, una minúscula, un número y un carácter especial, sin espacios',
      );
    });
  });

  describe('EMAIL_PATTERN', () => {
    it('exige dominio y extensión', () => {
      expect(EMAIL_PATTERN.test('ana@correo.com')).toBeTrue();
      expect(EMAIL_PATTERN.test('ana@correo')).toBeFalse();
      expect(EMAIL_PATTERN.test('ana correo@x.com')).toBeFalse();
    });
  });

  describe('matchFields', () => {
    const grupo = (a: string, b: string) =>
      new FormGroup({ contrasena: new FormControl(a), confirmarContrasena: new FormControl(b) });

    it('falla si la confirmación no coincide', () => {
      expect(
        matchFields('contrasena', 'confirmarContrasena')(grupo('Segura#123', 'Otra#123')),
      ).toEqual({
        fieldsMismatch: true,
      });
      expect(firstErrorMessage({ fieldsMismatch: true })).toBe(
        'La confirmación no coincide con la contraseña',
      );
    });

    it('pasa si coinciden o si la confirmación está vacía', () => {
      const validador = matchFields('contrasena', 'confirmarContrasena');
      expect(validador(grupo('Segura#123', 'Segura#123'))).toBeNull();
      expect(validador(grupo('Segura#123', ''))).toBeNull();
    });
  });
});
