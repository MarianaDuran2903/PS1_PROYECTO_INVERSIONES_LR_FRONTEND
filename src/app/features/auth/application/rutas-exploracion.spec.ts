import { RolUsuario } from '../domain/models/rol-usuario';
import { rutaInicialPorRol } from './rutas';

describe('Destinos iniciales de exploración y gestión', () => {
  it('lleva al Huésped al inicio público', () => {
    expect(rutaInicialPorRol([RolUsuario.Huesped])).toBe('/');
  });

  it('lleva al Anfitrión directamente a Mis publicaciones', () => {
    expect(rutaInicialPorRol([RolUsuario.Anfitrion])).toBe('/anfitrion/publicaciones');
  });

  it('mantiene al Administrador en administración', () => {
    expect(rutaInicialPorRol([RolUsuario.Administrador])).toBe('/admin');
  });

  it('mantiene la prioridad de Administrador sobre otros roles', () => {
    expect(
      rutaInicialPorRol([RolUsuario.Huesped, RolUsuario.Anfitrion, RolUsuario.Administrador]),
    ).toBe('/admin');
  });

  it('mantiene la prioridad de Anfitrión sobre Huésped', () => {
    expect(rutaInicialPorRol([RolUsuario.Huesped, RolUsuario.Anfitrion])).toBe(
      '/anfitrion/publicaciones',
    );
  });

  it('usa el inicio cuando no hay roles', () => {
    expect(rutaInicialPorRol([])).toBe('/');
  });
});
