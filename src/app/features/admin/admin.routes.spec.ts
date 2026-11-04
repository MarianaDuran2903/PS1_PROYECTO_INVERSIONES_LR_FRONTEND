import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { environment } from '@env/environment';
import { rolGuard } from '@features/auth/application/guards/access.guards';
import { SESSION_STORAGE_KEY, SessionService } from '@features/auth/application/session.service';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { ADMIN_ROUTES } from './admin.routes';

@Component({ template: 'Sin permisos' })
class SinPermisosStub {}

@Component({ template: 'Login' })
class LoginStub {}

describe('ADMIN_ROUTES: /admin/publicaciones/:id/editar (intervención administrativa)', () => {
  const RUTA = '/admin/publicaciones/9/editar';
  const API = '/api-test';
  const PUBLICACION = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'BLOQUEADA',
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: null,
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 0,
    reglas: null,
  };

  let session: SessionService;
  let confirmacion: jasmine.SpyObj<ConfirmacionService>;

  const iniciarSesionCon = (...roles: RolUsuario[]) =>
    session.iniciar({
      accessToken: 't',
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
  const abrirComoAdministrador = async () => {
    iniciarSesionCon('ADMINISTRADOR');
    const controller = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);
    controller.expectOne(`${API}/ciudades`).flush([{ id: 1, nombre: 'Bogotá' }]);
    controller.expectOne(`${API}/tipos-alojamiento`).flush([{ id: 2, nombre: 'Casa' }]);
    controller.expectOne(`${API}/admin/publicaciones/9`).flush(PUBLICACION);
    harness.detectChanges();
    return { harness, controller };
  };

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    confirmacion = jasmine.createSpyObj<ConfirmacionService>('ConfirmacionService', ['confirmar']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            {
              path: 'admin',
              canActivate: [rolGuard([RolUsuario.Administrador])],
              children: ADMIN_ROUTES,
            },
            { path: 'acceso-denegado', component: SinPermisosStub },
            { path: 'login', component: LoginStub },
          ],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...environment, apiUrl: API, logLevel: 'error' } },
        { provide: ConfirmacionService, useValue: confirmacion },
      ],
    });
    session = TestBed.inject(SessionService);
  });

  afterEach(() => {
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  for (const rol of ['ANFITRION', 'HUESPED'] as const) {
    it(`un ${rol} (sin rol Administrador) es denegado y no se hace ninguna petición`, async () => {
      iniciarSesionCon(rol);
      const controller = TestBed.inject(HttpTestingController);

      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(RUTA);

      expect(url()).toBe('/acceso-denegado');
      controller.expectNone(`${API}/admin/publicaciones/9`);
      controller.verify();
    });
  }

  it('sin sesión va al login recordando la ruta', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(url()).toContain('/login?returnUrl=');
  });

  it('un Administrador entra y la pantalla pide la publicación por la ruta de administrador', async () => {
    const { harness, controller } = await abrirComoAdministrador();

    expect(url()).toBe(RUTA);
    expect(harness.routeNativeElement!.querySelector<HTMLInputElement>('#titulo')!.value).toBe(
      'Apartamento luminoso',
    );
    expect(harness.routeNativeElement!.querySelector('#motivo')).not.toBeNull();
    controller.verify();
  });

  it('el panel /admin no pide nada al backend y muestra el buscador', async () => {
    iniciarSesionCon('ADMINISTRADOR');
    const controller = TestBed.inject(HttpTestingController);

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');

    expect(url()).toBe('/admin');
    expect(harness.routeNativeElement!.querySelector('app-buscador-publicacion')).not.toBeNull();
    controller.verify();
  });

  it('con cambios sin guardar pregunta antes de salir y se queda si no se acepta', async () => {
    const { harness } = await abrirComoAdministrador();
    const motivo = harness.routeNativeElement!.querySelector<HTMLTextAreaElement>('#motivo')!;
    motivo.value = 'Corrección de la publicación';
    motivo.dispatchEvent(new Event('input'));
    confirmacion.confirmar.and.returnValue(false);

    await harness.navigateByUrl('/admin');

    expect(confirmacion.confirmar).toHaveBeenCalledTimes(1);
    expect(url()).toBe(RUTA);
  });

  it('con cambios sin guardar sale si la persona acepta', async () => {
    const { harness } = await abrirComoAdministrador();
    const motivo = harness.routeNativeElement!.querySelector<HTMLTextAreaElement>('#motivo')!;
    motivo.value = 'Corrección de la publicación';
    motivo.dispatchEvent(new Event('input'));
    confirmacion.confirmar.and.returnValue(true);

    await harness.navigateByUrl('/admin');

    expect(url()).toBe('/admin');
  });

  it('sin cambios sale sin preguntar', async () => {
    const { harness } = await abrirComoAdministrador();

    await harness.navigateByUrl('/admin');

    expect(confirmacion.confirmar).not.toHaveBeenCalled();
    expect(url()).toBe('/admin');
  });
});
