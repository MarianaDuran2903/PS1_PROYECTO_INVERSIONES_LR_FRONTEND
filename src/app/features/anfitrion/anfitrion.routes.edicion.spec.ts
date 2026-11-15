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
import { ANFITRION_ROUTES } from './anfitrion.routes';

@Component({ template: 'Sin permisos' })
class SinPermisosStub {}

@Component({ template: 'Login' })
class LoginStub {}

describe('ANFITRION_ROUTES: /anfitrion/publicaciones/:id/editar', () => {
  const RUTA = '/anfitrion/publicaciones/9/editar';
  const API = '/api-test';
  const PUBLICACION = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'BORRADOR',
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
  const abrirComoAnfitrion = async () => {
    iniciarSesionCon('ANFITRION');
    const controller = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);
    controller.expectOne(`${API}/ciudades`).flush([{ id: 1, nombre: 'Bogotá' }]);
    controller.expectOne(`${API}/tipos-alojamiento`).flush([{ id: 2, nombre: 'Casa' }]);
    controller.expectOne(`${API}/publicaciones/9`).flush(PUBLICACION);
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
              path: 'anfitrion',
              canActivate: [rolGuard([RolUsuario.Anfitrion])],
              children: ANFITRION_ROUTES,
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

  it('un Huésped que entra va a la página de sin permisos', async () => {
    iniciarSesionCon('HUESPED');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(url()).toBe('/acceso-denegado');
  });

  it('un Administrador tampoco entra: la ruta es solo del Anfitrión', async () => {
    iniciarSesionCon('ADMINISTRADOR');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(url()).toBe('/acceso-denegado');
  });

  it('sin sesión va al login recordando la ruta', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(url()).toContain('/login?returnUrl=');
  });

  it('un Anfitrión entra, el id llega a la pantalla y se precarga la publicación', async () => {
    const { harness, controller } = await abrirComoAnfitrion();

    expect(url()).toBe(RUTA);
    expect(harness.routeNativeElement!.querySelector<HTMLInputElement>('#titulo')!.value).toBe(
      'Apartamento luminoso',
    );
    controller.verify();
  });

  it('con cambios sin guardar pregunta antes de salir y se queda si no se acepta', async () => {
    const { harness } = await abrirComoAnfitrion();
    const titulo = harness.routeNativeElement!.querySelector<HTMLInputElement>('#titulo')!;
    titulo.value = 'Otro título';
    titulo.dispatchEvent(new Event('input'));
    confirmacion.confirmar.and.returnValue(false);

    await harness.navigateByUrl('/anfitrion');

    expect(confirmacion.confirmar).toHaveBeenCalledTimes(1);
    expect(url()).toBe(RUTA);
  });

  it('con cambios sin guardar sale si la persona acepta', async () => {
    const { harness } = await abrirComoAnfitrion();
    const titulo = harness.routeNativeElement!.querySelector<HTMLInputElement>('#titulo')!;
    titulo.value = 'Otro título';
    titulo.dispatchEvent(new Event('input'));
    confirmacion.confirmar.and.returnValue(true);

    await harness.navigateByUrl('/anfitrion');

    expect(url()).toBe('/anfitrion');
  });

  it('sin cambios sale sin preguntar', async () => {
    const { harness } = await abrirComoAnfitrion();

    await harness.navigateByUrl('/anfitrion');

    expect(confirmacion.confirmar).not.toHaveBeenCalled();
    expect(url()).toBe('/anfitrion');
  });
});
