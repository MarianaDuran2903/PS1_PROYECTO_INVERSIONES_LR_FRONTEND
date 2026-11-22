import { idReservaValido } from './id-reserva';

describe('idReservaValido', () => {
  for (const [texto, esperado] of [
    ['1', 1],
    ['31', 31],
    ['9007199254740991', 9007199254740991],
  ] as const) {
    it(`acepta "${texto}"`, () => {
      expect(idReservaValido(texto)).toBe(esperado);
    });
  }

  for (const texto of ['0', '-1', '01', '1.5', '1e3', 'abc', '', ' 5', '9007199254740993']) {
    it(`rechaza "${texto}"`, () => {
      expect(idReservaValido(texto)).toBeNull();
    });
  }

  it('rechaza un valor ausente', () => {
    expect(idReservaValido(undefined)).toBeNull();
    expect(idReservaValido(null)).toBeNull();
  });
});
