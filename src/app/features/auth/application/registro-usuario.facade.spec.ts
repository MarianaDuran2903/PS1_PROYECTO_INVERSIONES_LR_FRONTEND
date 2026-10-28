import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { EventTrackerService } from '@core/tracking/event-tracker.service';
import { Subject } from 'rxjs';
import { CorreoYaRegistradoError, RegistroInvalidoError } from '../domain/errors/registro.errors';
import { RegistroUsuario, UsuarioRegistrado } from '../domain/models/registro-usuario';
import { AuthRepository } from '../domain/repositories/auth.repository';
import { EVENTO_USUARIO_REGISTRADO, RegistroUsuarioFacade } from './registro-usuario.facade';

describe('RegistroUsuarioFacade', () => {
  const datos: RegistroUsuario = {
    rol: 'HUESPED',
    primerNombre: 'Ana',
    primerApellido: 'Ruiz',
    correo: 'ana@correo.com',
    contrasena: 'Segura#2026',
    confirmarContrasena: 'Segura#2026',
  };
  const usuario: UsuarioRegistrado = {
    idUsuario: 1,
    primerNombre: 'Ana',
    primerApellido: 'Ruiz',
    correo: 'ana@correo.com',
    roles: ['HUESPED'],
  };

  let respuesta: Subject<UsuarioRegistrado>;
  let repository: jasmine.SpyObj<AuthRepository>;
  let tracker: jasmine.SpyObj<EventTrackerService>;
  let toast: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;
  let facade: RegistroUsuarioFacade;

  beforeEach(() => {
    respuesta = new Subject<UsuarioRegistrado>();
    repository = jasmine.createSpyObj<AuthRepository>('AuthRepository', ['registrarUsuario']);
    repository.registrarUsuario.and.returnValue(respuesta);
    tracker = jasmine.createSpyObj<EventTrackerService>('EventTrackerService', ['track']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        RegistroUsuarioFacade,
        { provide: AuthRepository, useValue: repository },
        { provide: EventTrackerService, useValue: tracker },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
      ],
    });
    facade = TestBed.inject(RegistroUsuarioFacade);
  });

  it('registra al huésped y deja traza del evento sin datos personales', () => {
    facade.registrar(datos);
    expect(facade.enviando()).toBeTrue();

    respuesta.next(usuario);
    respuesta.complete();

    expect(facade.estado()).toBe('exitoso');
    expect(facade.usuario()).toEqual(usuario);
    expect(tracker.track).toHaveBeenCalledOnceWith(EVENTO_USUARIO_REGISTRADO, {
      idUsuario: 1,
      roles: ['HUESPED'],
    });
  });

  it('tras registrarse no abre sesión: lleva al login con el aviso de cuenta creada', () => {
    facade.registrar(datos);
    respuesta.next(usuario);

    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { registrado: 'true' },
    });
  });

  it('muestra un aviso de bienvenida con el nombre de la persona', () => {
    facade.registrar(datos);
    respuesta.next(usuario);

    expect(toast.success).toHaveBeenCalledOnceWith(
      '¡Bienvenido, Ana!',
      'Tu cuenta fue creada correctamente.',
    );
  });

  it('envía el rol elegido al repositorio y lo deja en la traza', () => {
    facade.registrar({ ...datos, rol: 'ANFITRION' });
    respuesta.next({ ...usuario, roles: ['ANFITRION'] });

    expect(repository.registrarUsuario.calls.mostRecent().args[0].rol).toBe('ANFITRION');
    expect(tracker.track).toHaveBeenCalledOnceWith(EVENTO_USUARIO_REGISTRADO, {
      idUsuario: 1,
      roles: ['ANFITRION'],
    });
  });

  it('ignora envíos repetidos mientras hay uno en curso', () => {
    facade.registrar(datos);
    facade.registrar(datos);

    expect(repository.registrarUsuario).toHaveBeenCalledTimes(1);
  });

  it('informa que el correo ya está registrado sin registrar el evento', () => {
    facade.registrar(datos);
    respuesta.error(new CorreoYaRegistradoError(datos.correo));

    expect(facade.estado()).toBe('error');
    expect(facade.erroresCampo().correo).toBe('El correo ya está registrado');
    expect(facade.mensajeError()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(facade.usuario()).toBeNull();
    expect(tracker.track).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('expone los errores de validación por campo', () => {
    facade.registrar(datos);
    respuesta.error(new RegistroInvalidoError({ contrasena: 'Contraseña débil' }));

    expect(facade.erroresCampo()).toEqual({ contrasena: 'Contraseña débil' });
    expect(facade.mensajeError()).toBeTruthy();
  });

  it('muestra el mensaje de un ApiError genérico', () => {
    facade.registrar(datos);
    respuesta.error(new ApiError(0, 'NETWORK_ERROR', 'Sin conexión'));

    expect(facade.mensajeError()).toBe('Sin conexión');
    expect(facade.erroresCampo()).toEqual({});
  });
});
