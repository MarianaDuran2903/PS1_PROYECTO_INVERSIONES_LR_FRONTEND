import { generarClaveIdempotencia } from './clave-idempotencia';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generarClaveIdempotencia', () => {
  it('genera un UUID v4', () => {
    expect(generarClaveIdempotencia()).toMatch(UUID_V4);
  });

  it('cada llamada da una clave distinta', () => {
    const claves = new Set(Array.from({ length: 50 }, () => generarClaveIdempotencia()));

    expect(claves.size).toBe(50);
  });

  describe('sin crypto.randomUUID (página que no es un contexto seguro)', () => {
    beforeEach(() => {
      Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    });

    afterEach(() => {
      delete (crypto as unknown as Record<string, unknown>)['randomUUID'];
    });

    it('arma igualmente un UUID v4 válido', () => {
      expect(typeof crypto.randomUUID).toBe('undefined');
      expect(generarClaveIdempotencia()).toMatch(UUID_V4);
    });

    it('sigue dando claves distintas', () => {
      const claves = new Set(Array.from({ length: 50 }, () => generarClaveIdempotencia()));

      expect(claves.size).toBe(50);
    });
  });
});
