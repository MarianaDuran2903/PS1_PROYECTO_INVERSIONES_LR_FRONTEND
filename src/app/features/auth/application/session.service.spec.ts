import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Sesion } from '../domain/models/sesion';
import { SESSION_STORAGE_KEY, SessionService } from './session.service';

describe('SessionService', () => {
  const UNA_HORA = 3_600_000;
  const usuario: Sesion['usuario'] = {
    idUsuario: 1,
    primerNombre: 'Ana',
    primerApellido: 'Ruiz',
    correo: 'ana@correo.com',
    roles: ['ANFITRION', 'HUESPED'],
  };
  const sesionQueVence = (enMs: number): Sesion => ({
    accessToken: 'token-123',
    expiraEn: Date.now() + enMs,
    usuario,
  });
  const crear = () => TestBed.runInInjectionContext(() => new SessionService());

  let router: Router;

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });
  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  it('empieza sin sesión', () => {
    const service = crear();

    expect(service.autenticado()).toBeFalse();
    expect(service.usuario()).toBeNull();
    expect(service.token()).toBeNull();
  });

  it('guarda la sesión con su vencimiento y la recupera al recargar la página', () => {
    const sesion = sesionQueVence(UNA_HORA);
    const original = crear();
    original.iniciar(sesion);

    const despuesDeRecargar = crear();

    expect(despuesDeRecargar.autenticado()).toBeTrue();
    expect(despuesDeRecargar.token()).toBe('token-123');
    expect(despuesDeRecargar.usuario()?.primerNombre).toBe('Ana');
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!).expiraEn).toBe(sesion.expiraEn);
    original.cerrar();
  });

  it('no guarda la contraseña ni otros datos sensibles', () => {
    const service = crear();
    service.iniciar(sesionQueVence(UNA_HORA));

    expect(Object.keys(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)).sort()).toEqual([
      'accessToken',
      'expiraEn',
      'usuario',
    ]);
    service.cerrar();
  });

  it('descarta una sesión guardada que ya venció', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sesionQueVence(-1000)));

    expect(crear().autenticado()).toBeFalse();
  });

  it('cerrar borra la sesión de memoria y del almacenamiento', () => {
    const service = crear();
    service.iniciar(sesionQueVence(UNA_HORA));

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

  it('actualizar aplica el usuario y el vencimiento que informa el servidor', () => {
    const service = crear();
    service.iniciar(sesionQueVence(UNA_HORA));
    const nuevoVencimiento = Date.now() + 2 * UNA_HORA;

    service.actualizar({
      usuario: { ...usuario, roles: ['ADMINISTRADOR'] },
      expiraEn: nuevoVencimiento,
    });

    expect(service.usuario()?.roles).toEqual(['ADMINISTRADOR']);
    expect(service.token()).toBe('token-123');
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!).expiraEn).toBe(
      nuevoVencimiento,
    );
    service.cerrar();
  });

  it('actualizar no hace nada si no hay sesión', () => {
    const service = crear();

    service.actualizar({ usuario, expiraEn: Date.now() + UNA_HORA });

    expect(service.autenticado()).toBeFalse();
  });

  it('tieneAlgunRol: sin sesión nunca; sin roles pedidos basta estar autenticado', () => {
    const service = crear();
    expect(service.tieneAlgunRol([])).toBeFalse();
    expect(service.tieneAlgunRol(['HUESPED'])).toBeFalse();

    service.iniciar(sesionQueVence(UNA_HORA));

    expect(service.tieneAlgunRol([])).toBeTrue();
    expect(service.tieneAlgunRol(['HUESPED'])).toBeTrue();
    expect(service.tieneAlgunRol(['ADMINISTRADOR'])).toBeFalse();
    expect(service.tieneAlgunRol(['ADMINISTRADOR', 'ANFITRION'])).toBeTrue();
    service.cerrar();
  });

  it('al vencer el token cierra la sesión sola y lleva a /login?expirada=true', fakeAsync(() => {
    const service = crear();
    service.iniciar(sesionQueVence(UNA_HORA));

    tick(UNA_HORA - 1);
    expect(service.autenticado()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();

    tick(1);
    expect(service.autenticado()).toBeFalse();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { expirada: 'true' },
    });
  }));

  it('programa el cierre también para una sesión recuperada al recargar', fakeAsync(() => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sesionQueVence(5000)));
    const service = crear();
    expect(service.autenticado()).toBeTrue();

    tick(5000);

    expect(service.autenticado()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledTimes(1);
  }));

  it('cerrar a mano cancela el cierre automático', fakeAsync(() => {
    const service = crear();
    service.iniciar(sesionQueVence(UNA_HORA));

    service.cerrar();
    tick(UNA_HORA);

    expect(router.navigate).not.toHaveBeenCalled();
  }));
});
