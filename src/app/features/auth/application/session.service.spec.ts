import { TestBed } from '@angular/core/testing';
import { Sesion } from '../domain/models/sesion';
import { SESSION_STORAGE_KEY, SessionService } from './session.service';

describe('SessionService', () => {
  const sesion: Sesion = {
    accessToken: 'token-123',
    usuario: {
      idUsuario: 1,
      primerNombre: 'Ana',
      primerApellido: 'Ruiz',
      correo: 'ana@correo.com',
      roles: ['ANFITRION', 'HUESPED'],
    },
  };
  const crear = () => TestBed.runInInjectionContext(() => new SessionService());

  beforeEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  it('empieza sin sesión', () => {
    const service = crear();

    expect(service.autenticado()).toBeFalse();
    expect(service.usuario()).toBeNull();
    expect(service.token()).toBeNull();
  });

  it('guarda la sesión y la recupera al recargar la página', () => {
    crear().iniciar(sesion);

    const despuesDeRecargar = crear();

    expect(despuesDeRecargar.autenticado()).toBeTrue();
    expect(despuesDeRecargar.token()).toBe('token-123');
    expect(despuesDeRecargar.usuario()?.primerNombre).toBe('Ana');
  });

  it('cerrar borra la sesión de memoria y del almacenamiento', () => {
    const service = crear();
    service.iniciar(sesion);

    service.cerrar();

    expect(service.autenticado()).toBeFalse();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(crear().autenticado()).toBeFalse();
  });

  it('ignora datos corruptos o con forma inválida en el almacenamiento', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, '{no es json');
    expect(crear().autenticado()).toBeFalse();

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ accessToken: 5 }));
    expect(crear().autenticado()).toBeFalse();
  });

  it('tieneAlgunRol: sin sesión nunca; sin roles pedidos basta estar autenticado', () => {
    const service = crear();
    expect(service.tieneAlgunRol([])).toBeFalse();
    expect(service.tieneAlgunRol(['HUESPED'])).toBeFalse();

    service.iniciar(sesion);

    expect(service.tieneAlgunRol([])).toBeTrue();
    expect(service.tieneAlgunRol(['HUESPED'])).toBeTrue();
    expect(service.tieneAlgunRol(['ADMINISTRADOR'])).toBeFalse();
    expect(service.tieneAlgunRol(['ADMINISTRADOR', 'ANFITRION'])).toBeTrue();
  });
});
