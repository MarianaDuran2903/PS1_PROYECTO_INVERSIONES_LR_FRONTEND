import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import { EventTrackerService } from '@core/tracking/event-tracker.service';
import { Subject } from 'rxjs';
import { SolicitudRecuperacionInvalidaError } from '../domain/errors/recuperacion.errors';
import { AuthRepository } from '../domain/repositories/auth.repository';
import {
  EVENTO_RECUPERACION_SOLICITADA,
  MENSAJE_SOLICITUD_FALLIDA,
  MENSAJE_SOLICITUD_NEUTRAL,
  RecuperarContrasenaFacade,
} from './recuperar-contrasena.facade';

describe('RecuperarContrasenaFacade', () => {
  let respuesta: Subject<string>;
  let repository: jasmine.SpyObj<AuthRepository>;
  let tracker: jasmine.SpyObj<EventTrackerService>;
  let facade: RecuperarContrasenaFacade;

  beforeEach(() => {
    respuesta = new Subject<string>();
    repository = jasmine.createSpyObj<AuthRepository>('AuthRepository', ['solicitarRecuperacion']);
    repository.solicitarRecuperacion.and.returnValue(respuesta);
    tracker = jasmine.createSpyObj<EventTrackerService>('EventTrackerService', ['track']);
    TestBed.configureTestingModule({
      providers: [
        RecuperarContrasenaFacade,
        { provide: AuthRepository, useValue: repository },
        { provide: EventTrackerService, useValue: tracker },
      ],
    });
    facade = TestBed.inject(RecuperarContrasenaFacade);
  });

  it('muestra la confirmación neutral del backend y registra el evento sin datos', () => {
    facade.solicitar('ana@correo.com');
    expect(facade.enviando()).toBeTrue();

    respuesta.next('Si el correo está registrado, recibirás instrucciones');

    expect(facade.estado()).toBe('enviado');
    expect(facade.confirmacion()).toBe('Si el correo está registrado, recibirás instrucciones');
    expect(tracker.track).toHaveBeenCalledOnceWith(EVENTO_RECUPERACION_SOLICITADA);
  });

  it('usa el mensaje neutral por defecto si el backend no manda texto', () => {
    facade.solicitar('ana@correo.com');
    respuesta.next('');
    expect(facade.confirmacion()).toBe(MENSAJE_SOLICITUD_NEUTRAL);
  });

  it('ignora un segundo envío mientras hay uno en curso', () => {
    facade.solicitar('ana@correo.com');
    facade.solicitar('ana@correo.com');
    expect(repository.solicitarRecuperacion).toHaveBeenCalledTimes(1);
  });

  it('un 400 con errores.correo se expone junto al campo', () => {
    facade.solicitar('x');
    respuesta.error(new SolicitudRecuperacionInvalidaError({ correo: 'Ingrese un correo válido' }));

    expect(facade.estado()).toBe('error');
    expect(facade.errorCorreo()).toBe('Ingrese un correo válido');
    expect(facade.mensajeError()).toBeNull();
    expect(tracker.track).not.toHaveBeenCalled();
  });

  it('un error de red o 5xx muestra el mensaje fijo, sin detalles técnicos', () => {
    facade.solicitar('ana@correo.com');
    respuesta.error(new ApiError(500, 'HTTP_500', 'detalle interno'));

    expect(facade.mensajeError()).toBe(MENSAJE_SOLICITUD_FALLIDA);
    expect(facade.errorCorreo()).toBeNull();
  });

  it('después de un error se puede volver a enviar', () => {
    facade.solicitar('ana@correo.com');
    respuesta.error(new ApiError(0, 'NETWORK_ERROR', 'sin red'));
    respuesta = new Subject<string>();
    repository.solicitarRecuperacion.and.returnValue(respuesta);

    facade.solicitar('ana@correo.com');

    expect(facade.enviando()).toBeTrue();
    expect(facade.mensajeError()).toBeNull();
  });
});
