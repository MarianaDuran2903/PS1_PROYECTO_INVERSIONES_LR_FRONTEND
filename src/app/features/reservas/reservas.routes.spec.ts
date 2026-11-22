import { Injectable } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { RedireccionExterna } from '@core/navigation/redireccion-externa.service';
import { ToastService } from '@core/notifications/toast.service';
import { environment } from '@env/environment';
import { authTokenInterceptor } from '@features/auth/application/interceptors/auth-token.interceptor';
import { SESSION_STORAGE_KEY, SessionService } from '@features/auth/application/session.service';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { AuthRepository } from '@features/auth/domain/repositories/auth.repository';
import { routes } from '../../app.routes';

@Injectable()
class RedireccionFalsa extends RedireccionExterna {
  readonly destinos: string[] = [];

  protected override navegar(url: string): void {
    this.destinos.push(url);
  }
}

/** Rutas `/reservas/:idReserva/pago` y `/reservas/:idReserva/pago/resultado` (solo Huésped). */
describe('reservas.routes: pago de una reserva', () => {
  const API = '/api-test';
  const URL_PAGO = `${API}/reservas/31/pago`;
  const pago = {
    idPago: 7,
    idReserva: 31,
    estado: 'PENDIENTE',
    estadoReserva: 'PENDIENTE_PAGO',
    monto: 875000,
    moneda: 'COP',
    urlPago: 'https://checkout.stripe.com/c/pay/cs_test_abc',
    fechaExpiracion: '2030-06-01T10:35:00Z',
    codigoRechazo: null,
    motivoRechazo: null,
  };

  let session: SessionService;
  let controller: HttpTestingController;
  let redireccion: RedireccionFalsa;

  const iniciarSesionCon = (...roles: RolUsuario[]) =>
    session.iniciar({
      accessToken: 'token-de-prueba',
      expiraEn: Date.now() + 3_600_000,
      usuario: {
        idUsuario: 1,
        primerNombre: 'Ana',
        primerApellido: 'Ruiz',
        correo: 'a@b.co',
        roles,
      },
    });
  const url = () => TestBed.inject(Router).url;
  const textoDe = (elemento: HTMLElement) => elemento.textContent!.replace(/\s+/g, ' ');

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([authTokenInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...environment, apiUrl: API, logLevel: 'error' } },
        {
          provide: AuthRepository,
          useValue: jasmine.createSpyObj<AuthRepository>('AuthRepository', ['iniciarSesion']),
        },
        { provide: RedireccionExterna, useClass: RedireccionFalsa },
      ],
    });

    session = TestBed.inject(SessionService);
    controller = TestBed.inject(HttpTestingController);
    redireccion = TestBed.inject(RedireccionExterna) as RedireccionFalsa;
  });

  afterEach(() => controller.verify());

  describe('quién entra', () => {
    for (const ruta of ['/reservas/31/pago', '/reservas/31/pago/resultado?cancelado=true']) {
      it(`un Visitante en ${ruta} va al login recordando a dónde quería ir`, async () => {
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl(ruta);

        expect(url()).toContain('/login');
        expect(decodeURIComponent(url())).toContain(`returnUrl=${ruta}`);
        controller.expectNone(URL_PAGO);
      });

      it(`un Anfitrión en ${ruta} no tiene acceso`, async () => {
        iniciarSesionCon(RolUsuario.Anfitrion);
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl(ruta);

        expect(url()).toBe('/acceso-denegado');
        controller.expectNone(URL_PAGO);
      });
    }
  });

  describe('pagar la reserva', () => {
    it('el Huésped inicia el pago con su token, ve el total y continúa a la página de pago', async () => {
      iniciarSesionCon(RolUsuario.Huesped);
      const harness = await RouterTestingHarness.create();
      const componente = await harness.navigateByUrl('/reservas/31/pago');
      harness.detectChanges();
      const elemento = harness.routeNativeElement as HTMLElement;

      expect(textoDe(elemento)).toContain('Reserva #31');
      controller.expectNone(URL_PAGO);

      Array.from(elemento.querySelectorAll('button'))
        .find((b) => b.textContent!.includes('Pagar mi reserva'))!
        .click();

      const peticion = controller.expectOne(URL_PAGO);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toBeNull();
      expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
      peticion.flush(pago, { status: 201, statusText: 'Created' });
      harness.detectChanges();

      expect(componente).toBeTruthy();
      expect(textoDe(elemento)).toContain('$875,000');
      expect(redireccion.destinos).toEqual([]);

      Array.from(elemento.querySelectorAll('button'))
        .find((b) => b.textContent!.includes('Continuar a la página de pago'))!
        .click();

      expect(redireccion.destinos).toEqual(['https://checkout.stripe.com/c/pay/cs_test_abc']);
    });
  });

  describe('resultado del pago', () => {
    it('?cancelado=true llega a la pantalla como indicador y no espera ningún resultado', async () => {
      iniciarSesionCon(RolUsuario.Huesped);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/reservas/31/pago/resultado?cancelado=true');

      const peticion = controller.expectOne(URL_PAGO);
      expect(peticion.request.method).toBe('GET');
      expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
      peticion.flush(pago);
      harness.detectChanges();

      expect(textoDe(harness.routeNativeElement as HTMLElement)).toContain(
        'No se completó el pago',
      );
    });

    it('sin ?cancelado consulta y muestra el pago aprobado', async () => {
      iniciarSesionCon(RolUsuario.Huesped);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/reservas/31/pago/resultado');

      controller
        .expectOne(URL_PAGO)
        .flush({ ...pago, estado: 'APROBADO', estadoReserva: 'CONFIRMADA', urlPago: null });
      harness.detectChanges();

      const texto = textoDe(harness.routeNativeElement as HTMLElement);
      expect(texto).toContain('¡Pago aprobado!');
      expect(texto).toContain('Tu reserva quedó confirmada');
    });

    it('un 401 cierra la sesión y lleva al login con la sesión expirada', async () => {
      iniciarSesionCon(RolUsuario.Huesped);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/reservas/31/pago/resultado');

      controller
        .expectOne(URL_PAGO)
        .flush(
          { fecha: '', estado: 401, error: 'Unauthorized', mensaje: 'Token inválido', ruta: '' },
          { status: 401, statusText: 'Unauthorized' },
        );
      await harness.fixture.whenStable();

      expect(session.autenticado()).toBeFalse();
      expect(url()).toContain('/login');
      expect(url()).toContain('expirada=true');
    });

    it('un 403 se explica en la pantalla, sin el aviso global de permisos', async () => {
      const toast = spyOn(TestBed.inject(ToastService), 'error');
      iniciarSesionCon(RolUsuario.Huesped);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/reservas/31/pago/resultado');

      controller.expectOne(URL_PAGO).flush(
        {
          fecha: '',
          estado: 403,
          error: 'Forbidden',
          mensaje: 'No tiene permisos sobre esta reserva',
          ruta: '',
        },
        { status: 403, statusText: 'Forbidden' },
      );
      harness.detectChanges();

      expect(textoDe(harness.routeNativeElement as HTMLElement)).toContain(
        'Sin permisos sobre esta reserva',
      );
      expect(toast).not.toHaveBeenCalled();
      expect(session.autenticado()).toBeTrue();
    });
  });
});
