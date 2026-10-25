import { rutaInicialPorRol, urlInternaSegura } from './rutas';

describe('rutas', () => {
  describe('rutaInicialPorRol', () => {
    it('lleva a cada rol a su pantalla', () => {
      expect(rutaInicialPorRol(['HUESPED'])).toBe('/marketplace');
      expect(rutaInicialPorRol(['ANFITRION'])).toBe('/anfitrion');
      expect(rutaInicialPorRol(['ADMINISTRADOR'])).toBe('/admin');
    });

    it('con varios roles gana el de mayor alcance', () => {
      expect(rutaInicialPorRol(['HUESPED', 'ANFITRION'])).toBe('/anfitrion');
      expect(rutaInicialPorRol(['HUESPED', 'ADMINISTRADOR'])).toBe('/admin');
    });

    it('sin roles conocidos va al inicio', () => {
      expect(rutaInicialPorRol([])).toBe('/');
    });
  });

  describe('urlInternaSegura', () => {
    it('acepta rutas internas', () => {
      expect(urlInternaSegura('/marketplace')).toBe('/marketplace');
      expect(urlInternaSegura('/auth/registro?rol=anfitrion')).toBe('/auth/registro?rol=anfitrion');
    });

    it('rechaza destinos externos o vacíos (open redirect)', () => {
      for (const url of [
        'https://evil.com',
        '//evil.com',
        '/\\evil.com',
        'javascript:alert(1)',
        '',
        null,
        undefined,
      ]) {
        expect(urlInternaSegura(url)).withContext(String(url)).toBeNull();
      }
    });
  });
});
