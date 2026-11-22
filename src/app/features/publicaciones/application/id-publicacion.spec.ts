import { leerIdPublicacion } from './id-publicacion';

describe('leerIdPublicacion', () => {
  for (const [texto, esperado] of [
    ['9', 9],
    ['12', 12],
    ['007', 7],
  ] as const) {
    it(`"${texto}" es el id ${esperado}`, () => {
      expect(leerIdPublicacion(texto)).toBe(esperado);
    });
  }

  for (const invalido of [
    'abc',
    '1.5',
    '-3',
    '0',
    '',
    ' 5',
    '5 ',
    '1e3',
    '9007199254740993',
    undefined,
  ]) {
    it(`${JSON.stringify(invalido)} no es un id válido`, () => {
      expect(leerIdPublicacion(invalido)).toBeNull();
    });
  }
});
