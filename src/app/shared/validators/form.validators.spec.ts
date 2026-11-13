import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  analizarContrasena,
  decimalNoNegativo,
  decimalPositivo,
  EMAIL_PATTERN,
  enteroPositivo,
  matchFields,
  notBlank,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
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

  describe('contraseña de la recuperación (tabla del contrato HU-004)', () => {
    const largoValido = (valor: string) =>
      Validators.minLength(PASSWORD_MIN_LENGTH)(new FormControl(valor)) === null &&
      Validators.maxLength(PASSWORD_MAX_LENGTH)(new FormControl(valor)) === null;
    const errores = (valor: string) => {
      const control = new FormControl(valor);
      return (
        Validators.minLength(PASSWORD_MIN_LENGTH)(control) ??
        Validators.maxLength(PASSWORD_MAX_LENGTH)(control) ??
        strongPassword()(control)
      );
    };

    const casos: [string, string, boolean][] = [
      ['sin mayúscula', 'nueva#456', false],
      ['sin minúscula', 'NUEVA#456', false],
      ['sin número', 'Nueva#abc', false],
      ['sin carácter especial', 'Nueva4567', false],
      ['con espacio', 'Nueva #456', false],
      ['de 7 caracteres', 'Nue#4a6', false],
      ['de 65 caracteres', 'Nueva#456' + 'a'.repeat(56), false],
      ['de 64 caracteres', 'Nueva#456' + 'a'.repeat(55), true],
      ['de 8 caracteres', 'Nuev#456', true],
      ['válida del ejemplo', 'Nueva#456', true],
    ];
    for (const [descripcion, valor, valida] of casos) {
      it(`${valida ? 'acepta' : 'rechaza'} una contraseña ${descripcion}`, () => {
        expect(errores(valor) === null).toBe(valida);
      });
    }

    it('el largo de 8 a 64 se mide en caracteres', () => {
      expect(largoValido('1234567')).toBeFalse();
      expect(largoValido('12345678')).toBeTrue();
      expect(largoValido('a'.repeat(65))).toBeFalse();
    });

    it('la confirmación igual no da error y la distinta sí', () => {
      const grupo = (a: string, b: string) =>
        new FormGroup(
          { contrasena: new FormControl(a), confirmarContrasena: new FormControl(b) },
          { validators: matchFields('contrasena', 'confirmarContrasena') },
        );
      expect(grupo('Nueva#456', 'Nueva#456').errors).toBeNull();
      expect(grupo('Nueva#456', 'Nueva#457').errors).toEqual({ fieldsMismatch: true });
    });
  });

  describe('analizarContrasena', () => {
    it('detecta cada clase de carácter', () => {
      expect(analizarContrasena('Nueva#456')).toEqual({
        mayuscula: true,
        minuscula: true,
        numero: true,
        especial: true,
        espacio: false,
        bytes: 9,
      });
    });

    it('marca el espacio y cuenta los bytes UTF-8 de las tildes', () => {
      const resultado = analizarContrasena('Ñ a');
      expect(resultado.espacio).toBeTrue();
      expect(resultado.bytes).toBe(4);
    });

    it('en un texto vacío no hay nada', () => {
      expect(analizarContrasena('')).toEqual({
        mayuscula: false,
        minuscula: false,
        numero: false,
        especial: false,
        espacio: false,
        bytes: 0,
      });
  describe('enteroPositivo', () => {
    const validar = (valor: unknown) => enteroPositivo()(new FormControl(valor));

    for (const valido of ['4', '1', ' 12 ', '2147483647']) {
      it(`acepta "${valido}"`, () => {
        expect(validar(valido)).toBeNull();
      });
    }

    for (const invalido of ['0', '-1', '2.5', '2,5', 'abc', '1e3', '+3', '2147483648', '00']) {
      it(`rechaza "${invalido}"`, () => {
        expect(validar(invalido)).toEqual({ enteroPositivo: true });
      });
    }

    it('trata el vacío como válido (eso lo valida required)', () => {
      expect(validar('')).toBeNull();
      expect(validar('   ')).toBeNull();
      expect(validar(null)).toBeNull();
    });
  });

  describe('decimalPositivo', () => {
    const validar = (valor: unknown, decimales?: number, enteros?: number) =>
      decimalPositivo(decimales, enteros)(new FormControl(valor));

    for (const valido of ['250000.50', '250000', '0.01', '1.5', ' 99.99 ', '9999999999', '0.5']) {
      it(`acepta "${valido}"`, () => {
        expect(validar(valido)).toBeNull();
      });
    }

    for (const invalido of [
      '0',
      '0.00',
      '-5000',
      '100.555',
      '12345678901',
      '250000,50',
      '1.2.3',
      '.5',
      '5.',
      'abc',
      '1e5',
    ]) {
      it(`rechaza "${invalido}"`, () => {
        expect(validar(invalido)).toEqual({ decimalPositivo: true });
      });
    }

    it('respeta los máximos de decimales y de enteros recibidos', () => {
      expect(validar('1.5', 0)).toEqual({ decimalPositivo: true });
      expect(validar('123', 2, 2)).toEqual({ decimalPositivo: true });
      expect(validar('12.34', 2, 2)).toBeNull();
    });

    it('no cuenta los ceros a la izquierda como dígitos enteros', () => {
      expect(validar('00000000001')).toBeNull();
    });

    it('trata el vacío como válido (eso lo valida required)', () => {
      expect(validar('')).toBeNull();
      expect(validar(null)).toBeNull();
    });
  });

  describe('decimalNoNegativo', () => {
    const validar = (valor: unknown) => decimalNoNegativo()(new FormControl(valor));

    for (const valido of ['0', '0.00', '0.5', '15000', '15000.50', ' 20 ', '9999999999']) {
      it(`acepta "${valido}"`, () => {
        expect(validar(valido)).toBeNull();
      });
    }

    for (const invalido of ['-1', '-0.5', '100.555', '12345678901', '15000,50', '1.2.3', 'abc']) {
      it(`rechaza "${invalido}"`, () => {
        expect(validar(invalido)).toEqual({ decimalNoNegativo: true });
      });
    }

    it('trata el vacío como válido (eso lo valida required)', () => {
      expect(validar('')).toBeNull();
      expect(validar(null)).toBeNull();
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
