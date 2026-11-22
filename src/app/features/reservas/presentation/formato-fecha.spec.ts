import { fechaLegible } from './formato-fecha';

describe('fechaLegible', () => {
  it('da una fecha con hora legible a partir de un instante ISO', () => {
    const texto = fechaLegible('2030-06-01T10:35:00Z');

    expect(texto).toContain('2030');
    expect(texto).toMatch(/\d{1,2}:\d{2}/);
  });

  it('devuelve null si no hay fecha o no es válida', () => {
    expect(fechaLegible(null)).toBeNull();
    expect(fechaLegible(undefined)).toBeNull();
    expect(fechaLegible('')).toBeNull();
    expect(fechaLegible('no es una fecha')).toBeNull();
  });
});
