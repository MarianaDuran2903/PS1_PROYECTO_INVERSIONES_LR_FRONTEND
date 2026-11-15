import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { EventTrackerService } from '@core/tracking/event-tracker.service';
import { Subject } from 'rxjs';
import { CredencialesInvalidasError } from '../domain/errors/login.errors';
import { Credenciales, Sesion } from '../domain/models/sesion';
import { AuthRepository } from '../domain/repositories/auth.repository';
import { EVENTO_INICIO_SESION_FALLIDO, EVENTO_SESION_INICIADA, LoginFacade } from './login.facade';
import { SESSION_STORAGE_KEY, SessionService } from './session.service';
import { CuentaDesactivadaError } from '@features/auth/domain/errors/cuenta-desactivada.error';

describe('LoginFacade', () => {
  const credenciales: Credenciales = { correo: 'ana@correo.com', contrasena: 'Segura#2026' };
  const sesionCon = (...roles: Sesion['usuario']['roles']): Sesion => ({
    accessToken: 'token',
    expiraEn: Date.now() + 3_600_000,
    usuario: {
      idUsuario: 7,
      primerNombre: 'Ana',
      primerApellido: 'Ruiz',
      correo: 'ana@correo.com',
      roles,
    },
  });

  let respuesta: Subject<Sesion>;
  let repository: jasmine.SpyObj<AuthRepository>;
  let tracker: jasmine.SpyObj<EventTrackerService>;
  let toast: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;
  let session: SessionService;
  let facade: LoginFacade;

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    respuesta = new Subject<Sesion>();
    repository = jasmine.createSpyObj<AuthRepository>('AuthRepository', [
      'iniciarSesion',
      'reactivarCuenta',
    ]);
    repository.iniciarSesion.and.returnValue(respuesta);
    repository.reactivarCuenta.and.returnValue(respuesta);
    tracker = jasmine.createSpyObj<EventTrackerService>('EventTrackerService', ['track']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        LoginFacade,
        { provide: AuthRepository, useValue: repository },
        { provide: EventTrackerService, useValue: tracker },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
      ],
    });
    session = TestBed.inject(SessionService);
    facade = TestBed.inject(LoginFacade);
  });
  afterEach(() => {
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  it('abre la sesión, avisa y lleva a la pantalla del rol', () => {
    facade.iniciarSesion(credenciales);
    expect(facade.enviando()).toBeTrue();

    respuesta.next(sesionCon('ADMINISTRADOR'));

    expect(session.autenticado()).toBeTrue();
    expect(facade.enviando()).toBeFalse();
    expect(toast.success).toHaveBeenCalledOnceWith('¡Hola de nuevo, Ana!');
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/admin');
    expect(tracker.track).toHaveBeenCalledOnceWith(EVENTO_SESION_INICIADA, {
      idUsuario: 7,
      roles: ['ADMINISTRADOR'],
    });
  });

  it('vuelve a la ruta que la persona quería abrir si es interna', () => {
    facade.iniciarSesion(credenciales, '/marketplace?ciudad=Cali');
    respuesta.next(sesionCon('HUESPED'));

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/marketplace?ciudad=Cali');
  });

  it('ignora un returnUrl externo', () => {
    facade.iniciarSesion(credenciales, '//evil.com');
    respuesta.next(sesionCon('ANFITRION'));

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/anfitrion');
  });

  it('credenciales incorrectas: mensaje genérico, sin sesión y con traza sin datos personales', () => {
    facade.iniciarSesion(credenciales);
    respuesta.error(new CredencialesInvalidasError());

    expect(facade.mensajeError()).toBe('Correo o contraseña incorrectos');
    expect(facade.enviando()).toBeFalse();
    expect(session.autenticado()).toBeFalse();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(tracker.track).toHaveBeenCalledOnceWith(EVENTO_INICIO_SESION_FALLIDO, {
      motivo: 'CREDENCIALES_INVALIDAS',
    });
  });

  it('otros errores del API muestran su mensaje; los desconocidos, uno genérico', () => {
    facade.iniciarSesion(credenciales);
    respuesta.error(new ApiError(0, 'NETWORK_ERROR', 'Sin conexión'));
    expect(facade.mensajeError()).toBe('Sin conexión');

    respuesta = new Subject<Sesion>();
    repository.iniciarSesion.and.returnValue(respuesta);
    facade.iniciarSesion(credenciales);
    respuesta.error(new Error('boom'));
    expect(facade.mensajeError()).toContain('No fue posible iniciar sesión');
  });

  it('ignora envíos repetidos mientras hay uno en curso', () => {
    facade.iniciarSesion(credenciales);
    facade.iniciarSesion(credenciales);

    expect(repository.iniciarSesion).toHaveBeenCalledTimes(1);
  });

  describe('cuenta desactivada', () => {
    it('muestra el modal de reactivación sin crear sesión ni redirigir', () => {
      facade.iniciarSesion(credenciales);
      respuesta.error(new CuentaDesactivadaError());

      expect(facade.cuentaDesactivada()).toBeTrue();
      expect(facade.mensajeError()).toBeNull();
      expect(facade.enviando()).toBeFalse();
      expect(session.autenticado()).toBeFalse();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(tracker.track).toHaveBeenCalledOnceWith(EVENTO_INICIO_SESION_FALLIDO, {
        motivo: 'CUENTA_DESACTIVADA',
      });
    });

    it('reactiva con las mismas credenciales, inicia sesión y navega', () => {
      facade.iniciarSesion(credenciales, '/marketplace?ciudad=Cali');
      respuesta.error(new CuentaDesactivadaError());

      const respuestaReactivacion = new Subject<Sesion>();
      repository.reactivarCuenta.and.returnValue(respuestaReactivacion);

      facade.confirmarReactivacion();
      expect(repository.reactivarCuenta).toHaveBeenCalledOnceWith(credenciales);
      expect(facade.reactivando()).toBeTrue();

      respuestaReactivacion.next(sesionCon('HUESPED'));

      expect(session.autenticado()).toBeTrue();
      expect(facade.cuentaDesactivada()).toBeFalse();
      expect(facade.reactivando()).toBeFalse();
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/marketplace?ciudad=Cali');
      expect(toast.success).toHaveBeenCalledOnceWith('¡Hola de nuevo, Ana!');
    });

    it('cancelar cierra el modal, limpia credenciales y no reactiva', () => {
      facade.iniciarSesion(credenciales);
      respuesta.error(new CuentaDesactivadaError());

      facade.cancelarReactivacion();

      expect(facade.cuentaDesactivada()).toBeFalse();
      expect(facade.mensajeError()).toBeNull();
      expect(facade.reactivando()).toBeFalse();

      facade.confirmarReactivacion();
      expect(repository.reactivarCuenta).not.toHaveBeenCalled();
    });

    it('si la reactivación falla, mantiene el modal y muestra el error', () => {
      facade.iniciarSesion(credenciales);
      respuesta.error(new CuentaDesactivadaError());

      const respuestaReactivacion = new Subject<Sesion>();
      repository.reactivarCuenta.and.returnValue(respuestaReactivacion);

      facade.confirmarReactivacion();
      respuestaReactivacion.error(new ApiError(0, 'NETWORK_ERROR', 'Sin conexión'));

      expect(facade.cuentaDesactivada()).toBeTrue();
      expect(facade.reactivando()).toBeFalse();
      expect(facade.mensajeError()).toBe('Sin conexión');
    });

    it('ignora una segunda reactivación mientras la primera está en curso', () => {
      facade.iniciarSesion(credenciales);
      respuesta.error(new CuentaDesactivadaError());

      const respuestaReactivacion = new Subject<Sesion>();
      repository.reactivarCuenta.and.returnValue(respuestaReactivacion);

      facade.confirmarReactivacion();
      facade.confirmarReactivacion();

      expect(repository.reactivarCuenta).toHaveBeenCalledTimes(1);
    });
  });
});
