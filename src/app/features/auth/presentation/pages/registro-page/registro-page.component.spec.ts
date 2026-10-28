import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { EventTrackerService } from '@core/tracking/event-tracker.service';
import { environment } from '@env/environment';
import { of, throwError } from 'rxjs';
import { CorreoYaRegistradoError } from '../../../domain/errors/registro.errors';
import { UsuarioRegistrado } from '../../../domain/models/registro-usuario';
import { AuthRepository } from '../../../domain/repositories/auth.repository';
import { RegistroPageComponent } from './registro-page.component';

/** HU-002: Registrarse como Anfitrión (criterios de aceptación, de punta a punta en la página). */
describe('RegistroPageComponent como Anfitrión', () => {
  const anfitrion: UsuarioRegistrado = {
    idUsuario: 12,
    primerNombre: 'Luis',
    primerApellido: 'Mora',
    correo: 'luis.mora@correo.com',
    roles: ['ANFITRION'],
  };

  let fixture: ComponentFixture<RegistroPageComponent>;
  let element: HTMLElement;
  let tracker: jasmine.SpyObj<EventTrackerService>;
  let repository: jasmine.SpyObj<AuthRepository>;
  let router: Router;

  const escribir = (id: string, valor: string) => {
    const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };
  const completar = (correo: string) => {
    escribir('primerNombre', 'Luis');
    escribir('primerApellido', 'Mora');
    escribir('correo', correo);
    escribir('contrasena', 'Segura#2026');
    escribir('confirmarContrasena', 'Segura#2026');
  };
  const enviar = () => {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
  };
  const rolMarcado = () =>
    element.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value;

  beforeEach(() => {
    tracker = jasmine.createSpyObj<EventTrackerService>('EventTrackerService', ['track']);
    repository = jasmine.createSpyObj<AuthRepository>('AuthRepository', ['registrarUsuario']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...environment, logLevel: 'error' } },
        { provide: AuthRepository, useValue: repository },
        { provide: EventTrackerService, useValue: tracker },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(RegistroPageComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('rol', 'anfitrion');
    fixture.detectChanges();
  });

  it('el enlace ?rol=anfitrion llega con Anfitrión preseleccionado', () => {
    expect(rolMarcado()).toBe('ANFITRION');
  });

  it('crea la cuenta con rol Anfitrión, registra el evento y lleva al login sin sesión', () => {
    repository.registrarUsuario.and.returnValue(of(anfitrion));
    completar('luis.mora@correo.com');
    enviar();

    expect(repository.registrarUsuario).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ rol: 'ANFITRION', correo: 'luis.mora@correo.com' }),
    );
    expect(tracker.track).toHaveBeenCalledOnceWith('USUARIO_REGISTRADO', {
      idUsuario: 12,
      roles: ['ANFITRION'],
    });
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { registrado: 'true' },
    });
  });

  it('informa que el correo ya está registrado y no crea la cuenta', () => {
    repository.registrarUsuario.and.returnValue(
      throwError(() => new CorreoYaRegistradoError('luis.mora@correo.com')),
    );
    completar('luis.mora@correo.com');
    enviar();

    expect(element.querySelector('#correo-error')!.textContent).toContain('ya está registrado');
    expect(tracker.track).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('con datos incompletos muestra los errores específicos y no llama al backend', () => {
    escribir('correo', 'sin-arroba');
    enviar();

    expect(element.querySelector('#primerNombre-error')!.textContent).toContain('obligatorio');
    expect(element.querySelector('#primerApellido-error')!.textContent).toContain('obligatorio');
    expect(element.querySelector('#correo-error')!.textContent).toContain(
      'correo electrónico válido',
    );
    expect(element.querySelector('#contrasena-error')!.textContent).toContain('obligatorio');
    expect(repository.registrarUsuario).not.toHaveBeenCalled();
    expect(tracker.track).not.toHaveBeenCalled();
  });
});
