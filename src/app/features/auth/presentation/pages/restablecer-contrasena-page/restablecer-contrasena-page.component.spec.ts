import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { EventTrackerService } from '@core/tracking/event-tracker.service';
import { environment } from '@env/environment';
import { of, Subject, throwError } from 'rxjs';
import {
  EnlaceRecuperacionInvalidoError,
  RestablecimientoInvalidoError,
} from '../../../domain/errors/recuperacion.errors';
import { AuthRepository } from '../../../domain/repositories/auth.repository';
import { RestablecerContrasenaPageComponent } from './restablecer-contrasena-page.component';

/** HU-004: pantalla para fijar la nueva contraseña (criterios 3 y 4, y la seguridad del token). */
describe('RestablecerContrasenaPageComponent', () => {
  const VALIDA = 'Nueva#456';

  let harness: RouterTestingHarness;
  let fixture: ComponentFixture<RestablecerContrasenaPageComponent>;
  let element: HTMLElement;
  let router: Router;
  let repository: jasmine.SpyObj<AuthRepository>;

  const abrir = async (url: string, production = true) => {
    repository = jasmine.createSpyObj<AuthRepository>('AuthRepository', ['restablecerContrasena']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'restablecer-contrasena', component: RestablecerContrasenaPageComponent },
        ]),
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
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
    const componente = await harness.navigateByUrl(url, RestablecerContrasenaPageComponent);
    fixture = harness.fixture as unknown as ComponentFixture<RestablecerContrasenaPageComponent>;
    element = fixture.nativeElement as HTMLElement;
    expect(componente).toBeTruthy();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const escribir = (id: string, valor: string) => {
    const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };
  const enviar = () => {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
  };
  const completar = () => {
    escribir('contrasena', VALIDA);
    escribir('confirmarContrasena', VALIDA);
    fixture.detectChanges();
  };

  describe('con el token en la URL', () => {
    beforeEach(async () => abrir('/restablecer-contrasena?token=tok123'));

    it('quita el token de la URL sin dejarlo en el historial', () => {
      expect(router.url).toBe('/restablecer-contrasena');
    });

    it('no pide el token: solo las dos contraseñas', () => {
      expect(element.querySelector('#token')).toBeNull();
      expect(element.querySelector('#contrasena')).not.toBeNull();
      expect(element.querySelector('#confirmarContrasena')).not.toBeNull();
    });

    it('envía el token tomado de la URL junto con las contraseñas', () => {
      repository.restablecerContrasena.and.returnValue(of('Tu contraseña se actualizó'));
      completar();
      enviar();

      expect(repository.restablecerContrasena).toHaveBeenCalledOnceWith({
        token: 'tok123',
        contrasena: VALIDA,
        confirmarContrasena: VALIDA,
      });
    });

    it('con éxito muestra el mensaje y el botón "Ir a iniciar sesión"', () => {
      repository.restablecerContrasena.and.returnValue(of('Tu contraseña se actualizó'));
      completar();
      enviar();

      expect(element.querySelector('[role="status"]')?.textContent).toContain(
        'Tu contraseña se actualizó',
      );
      const boton = element.querySelector<HTMLAnchorElement>('a[href="/login"]')!;
      expect(boton.textContent).toContain('Ir a iniciar sesión');
      expect(element.querySelector('form')).toBeNull();
    });

    it('no envía nada si la contraseña no cumple la regla', () => {
      escribir('contrasena', 'sinmayuscula1!');
      escribir('confirmarContrasena', 'sinmayuscula1!');
      enviar();

      expect(repository.restablecerContrasena).not.toHaveBeenCalled();
      expect(element.querySelector('#contrasena-error')?.textContent).toContain('mayúscula');
    });

    it('no envía nada si la confirmación no coincide', () => {
      escribir('contrasena', VALIDA);
      escribir('confirmarContrasena', 'Otra#4567');
      enviar();

      expect(repository.restablecerContrasena).not.toHaveBeenCalled();
      expect(element.querySelector('#confirmarContrasena-error')?.textContent).toContain(
        'no coincide',
      );
    });

    it('el checklist marca cada requisito en vivo', () => {
      escribir('contrasena', 'abc');
      fixture.detectChanges();
      const cumple = (clave: string) =>
        element
          .querySelector(`[data-requisito="${clave}"]`)!
          .classList.contains('requisitos__item--cumple');

      expect(cumple('minuscula')).toBeTrue();
      expect(cumple('mayuscula')).toBeFalse();
      expect(cumple('largo')).toBeFalse();

      escribir('contrasena', VALIDA);
      fixture.detectChanges();

      for (const clave of ['largo', 'mayuscula', 'minuscula', 'numero', 'especial', 'espacios']) {
        expect(cumple(clave)).withContext(clave).toBeTrue();
      }
    });

    it('un 400 con errores deja cada mensaje junto a su campo y lleva el foco al primero', () => {
      repository.restablecerContrasena.and.returnValue(
        throwError(
          () =>
            new RestablecimientoInvalidoError({
              contrasena: 'La contraseña es demasiado larga: reduzca los caracteres con tilde',
              confirmarContrasena: 'La confirmación no coincide con la contraseña',
            }),
        ),
      );
      completar();
      enviar();
      fixture.detectChanges();

      expect(element.querySelector('#contrasena-error')?.textContent).toContain('demasiado larga');
      expect(element.querySelector('#confirmarContrasena-error')?.textContent).toContain(
        'no coincide',
      );
      expect(document.activeElement?.id).toBe('contrasena');
    });

    it('un token inválido, vencido o usado muestra el mensaje y el botón para pedir otro enlace', () => {
      repository.restablecerContrasena.and.returnValue(
        throwError(() => new EnlaceRecuperacionInvalidoError()),
      );
      completar();
      enviar();

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'El enlace de recuperación no es válido o ha expirado',
      );
      const boton = element.querySelector<HTMLAnchorElement>('a[href="/recuperar-contrasena"]')!;
      expect(boton.textContent).toContain('Solicitar un nuevo enlace');
    });

    it('un error de red muestra el mensaje genérico y conserva el formulario', () => {
      repository.restablecerContrasena.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'sin red')),
      );
      completar();
      enviar();

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'No pudimos cambiar tu contraseña',
      );
      expect(element.querySelector('form')).not.toBeNull();
    });

    it('con la petición en curso deshabilita el botón', () => {
      repository.restablecerContrasena.and.returnValue(new Subject<string>());
      completar();
      enviar();

      const boton = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      expect(boton.matches(':disabled')).toBeTrue();
      expect(boton.getAttribute('aria-busy')).toBe('true');
    });

    it('el botón de mostrar contraseña alterna el tipo de los dos campos', () => {
      const tipo = (id: string) => element.querySelector<HTMLInputElement>(`#${id}`)!.type;
      expect(tipo('contrasena')).toBe('password');

      element.querySelector<HTMLButtonElement>('.field__toggle')!.click();
      fixture.detectChanges();

      expect(tipo('contrasena')).toBe('text');
      expect(tipo('confirmarContrasena')).toBe('text');
    });

    it('no guarda el token ni las contraseñas en el almacenamiento del navegador', () => {
      repository.restablecerContrasena.and.returnValue(of('ok'));
      completar();
      enviar();

      const guardado = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
      expect(guardado).not.toContain('tok123');
      expect(guardado).not.toContain(VALIDA);
    });

    it('no escribe el token ni las contraseñas en la consola', () => {
      const registros = [
        spyOn(console, 'log'),
        spyOn(console, 'info'),
        spyOn(console, 'warn'),
        spyOn(console, 'error'),
      ];
      repository.restablecerContrasena.and.returnValue(of('ok'));
      completar();
      enviar();

      const escrito = JSON.stringify(registros.flatMap((espia) => espia.calls.allArgs()));
      expect(escrito).not.toContain('tok123');
      expect(escrito).not.toContain(VALIDA);
    });
  });

  describe('sin token en la URL', () => {
    beforeEach(async () => abrir('/restablecer-contrasena'));

    it('muestra un campo para pegar el código', () => {
      expect(element.querySelector('#token')).not.toBeNull();
    });

    it('no envía si el código está vacío y avisa', () => {
      completar();
      enviar();

      expect(repository.restablecerContrasena).not.toHaveBeenCalled();
      expect(element.querySelector('#token-error')?.textContent).toContain('código');
    });

    it('envía el código pegado, sin espacios alrededor', () => {
      repository.restablecerContrasena.and.returnValue(of('ok'));
      escribir('token', '  pegado-123  ');
      completar();
      enviar();

      expect(repository.restablecerContrasena).toHaveBeenCalledOnceWith({
        token: 'pegado-123',
        contrasena: VALIDA,
        confirmarContrasena: VALIDA,
      });
    });

    it('un error del servidor sobre el código se muestra junto a su campo', () => {
      repository.restablecerContrasena.and.returnValue(
        throwError(() => new RestablecimientoInvalidoError({ token: 'El token es obligatorio' })),
      );
      escribir('token', 'x');
      completar();
      enviar();

      expect(element.querySelector('#token-error')?.textContent).toContain(
        'El token es obligatorio',
      );
    });
  });

  describe('nota del modo simulado', () => {
    it('aparece fuera de producción', async () => {
      await abrir('/restablecer-contrasena?token=t', false);
      expect(element.textContent).toContain('CORREO_SIMULADO_RECUPERACION');
    });

    it('no aparece en producción', async () => {
      await abrir('/restablecer-contrasena?token=t', true);
      expect(element.textContent).not.toContain('CORREO_SIMULADO_RECUPERACION');
    });
  });

  it('un error del servidor sobre el código con el token en la URL se muestra como aviso general', async () => {
    await abrir('/restablecer-contrasena?token=tok123');
    repository.restablecerContrasena.and.returnValue(
      throwError(() => new RestablecimientoInvalidoError({ token: 'El token es obligatorio' })),
    );
    completar();
    enviar();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'El token es obligatorio',
    );
  });
});
