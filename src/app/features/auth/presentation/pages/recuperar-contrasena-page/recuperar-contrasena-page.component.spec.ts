import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { EventTrackerService } from '@core/tracking/event-tracker.service';
import { environment } from '@env/environment';
import { of, Subject, throwError } from 'rxjs';
import { SolicitudRecuperacionInvalidaError } from '../../../domain/errors/recuperacion.errors';
import { AuthRepository } from '../../../domain/repositories/auth.repository';
import { RecuperarContrasenaPageComponent } from './recuperar-contrasena-page.component';

/** HU-004: pantalla de solicitud de recuperación (criterios 1 y 2). */
describe('RecuperarContrasenaPageComponent', () => {
  const NEUTRAL = 'Si el correo está registrado, recibirás las instrucciones';

  let fixture: ComponentFixture<RecuperarContrasenaPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<AuthRepository>;

  const crear = (production: boolean) => {
    repository = jasmine.createSpyObj<AuthRepository>('AuthRepository', ['solicitarRecuperacion']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...environment, production, logLevel: 'error' } },
        { provide: AuthRepository, useValue: repository },
        {
          provide: EventTrackerService,
          useValue: jasmine.createSpyObj<EventTrackerService>('EventTrackerService', ['track']),
        },
      ],
    });
    fixture = TestBed.createComponent(RecuperarContrasenaPageComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  };
  const escribirCorreo = (valor: string) => {
    const input = element.querySelector<HTMLInputElement>('#correo')!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };
  const enviar = () => {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
  };

  describe('en producción', () => {
    beforeEach(() => crear(true));

    it('muestra el campo de correo y el enlace para volver al login', () => {
      expect(element.querySelector('#correo')).not.toBeNull();
      expect(element.querySelector('a[href="/login"]')?.textContent).toContain(
        'Volver a iniciar sesión',
      );
    });

    it('con un correo válido llama al servicio y reemplaza el formulario por el mensaje neutral', () => {
      repository.solicitarRecuperacion.and.returnValue(of(NEUTRAL));
      escribirCorreo('carlos.gomez@correo.com');
      enviar();

      expect(repository.solicitarRecuperacion).toHaveBeenCalledOnceWith('carlos.gomez@correo.com');
      expect(element.querySelector('form')).toBeNull();
      expect(element.querySelector('[role="status"]')?.textContent).toContain(NEUTRAL);
    });

    it('un correo existente y uno inexistente producen exactamente la misma pantalla', () => {
      repository.solicitarRecuperacion.and.returnValue(of(NEUTRAL));
      escribirCorreo('existe@correo.com');
      enviar();
      const primera = element.innerHTML;

      fixture.destroy();
      TestBed.resetTestingModule();
      crear(true);
      repository.solicitarRecuperacion.and.returnValue(of(NEUTRAL));
      escribirCorreo('noexiste@correo.com');
      enviar();

      expect(element.innerHTML).toBe(primera);
    });

    it('no llama al servicio si el correo no es válido y muestra el error', () => {
      escribirCorreo('no-es-correo');
      enviar();

      expect(repository.solicitarRecuperacion).not.toHaveBeenCalled();
      expect(element.querySelector('#correo-error')?.textContent).toContain('correo');
    });

    it('un correo vacío no se envía', () => {
      enviar();
      expect(repository.solicitarRecuperacion).not.toHaveBeenCalled();
      expect(element.querySelector('#correo-error')?.textContent).toContain('obligatorio');
    });

    it('un 400 con errores.correo se muestra junto al campo', () => {
      repository.solicitarRecuperacion.and.returnValue(
        throwError(
          () => new SolicitudRecuperacionInvalidaError({ correo: 'Ingrese un correo válido' }),
        ),
      );
      escribirCorreo('carlos@correo.com');
      enviar();

      expect(element.querySelector('#correo-error')?.textContent).toContain(
        'Ingrese un correo válido',
      );
    });

    it('con la petición en curso deshabilita el botón y evita el doble envío', () => {
      repository.solicitarRecuperacion.and.returnValue(new Subject<string>());
      escribirCorreo('carlos@correo.com');
      enviar();

      const boton = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      expect(boton.matches(':disabled')).toBeTrue();
      expect(boton.getAttribute('aria-busy')).toBe('true');
      expect(boton.textContent).toContain('Enviando');
    });

    it('un error de red o 5xx muestra el mensaje genérico', () => {
      repository.solicitarRecuperacion.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'sin red')),
      );
      escribirCorreo('carlos@correo.com');
      enviar();

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'No pudimos procesar tu solicitud. Inténtalo de nuevo en unos minutos.',
      );
    });

    it('no muestra la nota del modo simulado', () => {
      repository.solicitarRecuperacion.and.returnValue(of(NEUTRAL));
      escribirCorreo('carlos@correo.com');
      enviar();

      expect(element.textContent).not.toContain('CORREO_SIMULADO_RECUPERACION');
    });
  });

  describe('fuera de producción', () => {
    beforeEach(() => crear(false));

    it('tras solicitar muestra la nota del modo simulado y el enlace "Ya tengo mi código"', () => {
      repository.solicitarRecuperacion.and.returnValue(of(NEUTRAL));
      escribirCorreo('carlos@correo.com');
      enviar();

      expect(element.textContent).toContain('CORREO_SIMULADO_RECUPERACION');
      expect(element.querySelector('a[href="/restablecer-contrasena"]')).not.toBeNull();
    });
  });
});
