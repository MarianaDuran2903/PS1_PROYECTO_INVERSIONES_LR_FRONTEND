import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import { EventTrackerService } from '@core/tracking/event-tracker.service';
import { Subject } from 'rxjs';
import {
  EnlaceRecuperacionInvalidoError,
  RestablecimientoInvalidoError,
} from '../domain/errors/recuperacion.errors';
import { RestablecerContrasena } from '../domain/models/recuperacion';
import { AuthRepository } from '../domain/repositories/auth.repository';
import {
  EVENTO_CONTRASENA_RESTABLECIDA,
  EVENTO_RESTABLECIMIENTO_FALLIDO,
  MENSAJE_RESTABLECIMIENTO_EXITOSO,
  MENSAJE_RESTABLECIMIENTO_FALLIDO,
  RestablecerContrasenaFacade,
} from './restablecer-contrasena.facade';

describe('RestablecerContrasenaFacade', () => {
  const datos: RestablecerContrasena = {
    token: 'tok-secreto',
    contrasena: 'Nueva#456',
    confirmarContrasena: 'Nueva#456',
  };

  let respuesta: Subject<string>;
  let repository: jasmine.SpyObj<AuthRepository>;
  let tracker: jasmine.SpyObj<EventTrackerService>;
  let facade: RestablecerContrasenaFacade;

  beforeEach(() => {
    respuesta = new Subject<string>();
    repository = jasmine.createSpyObj<AuthRepository>('AuthRepository', ['restablecerContrasena']);
    repository.restablecerContrasena.and.returnValue(respuesta);
    tracker = jasmine.createSpyObj<EventTrackerService>('EventTrackerService', ['track']);
    TestBed.configureTestingModule({
      providers: [
        RestablecerContrasenaFacade,
        { provide: AuthRepository, useValue: repository },
        { provide: EventTrackerService, useValue: tracker },
      ],
    });
    facade = TestBed.inject(RestablecerContrasenaFacade);
  });

  it('con éxito muestra el mensaje del backend y registra el evento sin datos', () => {
    facade.restablecer(datos);
    expect(facade.enviando()).toBeTrue();
    expect(repository.restablecerContrasena).toHaveBeenCalledOnceWith(datos);

    respuesta.next('Tu contraseña se actualizó');

    expect(facade.estado()).toBe('exitoso');
    expect(facade.confirmacion()).toBe('Tu contraseña se actualizó');
    expect(tracker.track).toHaveBeenCalledOnceWith(EVENTO_CONTRASENA_RESTABLECIDA);
  });

  it('usa el mensaje de éxito por defecto si el backend no manda texto', () => {
    facade.restablecer(datos);
    respuesta.next('');
    expect(facade.confirmacion()).toBe(MENSAJE_RESTABLECIMIENTO_EXITOSO);
  });

  it('ignora un segundo envío mientras hay uno en curso', () => {
    facade.restablecer(datos);
    facade.restablecer(datos);
    expect(repository.restablecerContrasena).toHaveBeenCalledTimes(1);
  });

  it('un 400 con errores deja cada mensaje en su campo', () => {
    facade.restablecer(datos);
    respuesta.error(
      new RestablecimientoInvalidoError({
        confirmarContrasena: 'La confirmación no coincide con la contraseña',
      }),
    );

    expect(facade.estado()).toBe('error');
    expect(facade.erroresCampo()).toEqual({
      confirmarContrasena: 'La confirmación no coincide con la contraseña',
    });
  });

  it('un token inválido, vencido o usado pasa a "enlaceInvalido" con el mensaje del backend', () => {
    facade.restablecer(datos);
    respuesta.error(new EnlaceRecuperacionInvalidoError());

    expect(facade.estado()).toBe('enlaceInvalido');
    expect(facade.mensajeEnlace()).toBe('El enlace de recuperación no es válido o ha expirado');
  });

  it('un error de red o 5xx muestra el mensaje fijo', () => {
    facade.restablecer(datos);
    respuesta.error(new ApiError(0, 'NETWORK_ERROR', 'sin red'));

    expect(facade.mensajeError()).toBe(MENSAJE_RESTABLECIMIENTO_FALLIDO);
  });

  it('la traza de un fallo lleva solo el motivo: nunca el token ni las contraseñas', () => {
    facade.restablecer(datos);
    respuesta.error(new EnlaceRecuperacionInvalidoError());

    expect(tracker.track).toHaveBeenCalledOnceWith(EVENTO_RESTABLECIMIENTO_FALLIDO, {
      motivo: 'ENLACE_INVALIDO',
    });
    const llamadas = JSON.stringify(tracker.track.calls.allArgs());
    expect(llamadas).not.toContain('tok-secreto');
    expect(llamadas).not.toContain('Nueva#456');
  });
});
