import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../../app.routes';
import { RolUsuario } from '../../domain/models/rol-usuario';
import { SessionService } from '../session.service';
import { exploracionGuard } from './exploracion.guard';

@Component({
  selector: 'app-destino-prueba',
  template: '<p>Destino de prueba</p>',
})
class DestinoPruebaComponent {}

describe('Exploración pública por rol', () => {
  let autenticado: boolean;
  let roles: RolUsuario[];

  beforeEach(() => {
    autenticado = false;
    roles = [];

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          ...routes
            .filter((route) => route.path === '' && route.pathMatch === 'full')
            .map((route) => ({
              ...route,
              loadComponent: undefined,
              component: DestinoPruebaComponent,
            })),
          ...routes
            .filter((route) => route.path === 'alojamientos')
            .map((route) => ({
              ...route,
              loadComponent: undefined,
              component: DestinoPruebaComponent,
            })),
          {
            path: 'anfitrion/publicaciones',
            component: DestinoPruebaComponent,
          },
          {
            path: 'admin',
            component: DestinoPruebaComponent,
          },
          {
            path: 'acceso-denegado',
            component: DestinoPruebaComponent,
          },
        ]),
        {
          provide: SessionService,
          useValue: {
            autenticado: () => autenticado,
            tieneAlgunRol: (permitidos: readonly RolUsuario[]) =>
              permitidos.some((rol) => roles.includes(rol)),
          },
        },
      ],
    });
  });

  it('protege inicio y resultados con el guard de exploración', () => {
    const inicio = routes.find((route) => route.path === '' && route.pathMatch === 'full');
    const resultados = routes.find((route) => route.path === 'alojamientos');

    expect(inicio?.canActivate).toContain(exploracionGuard);
    expect(resultados?.canActivate).toContain(exploracionGuard);
  });

  for (const ruta of ['/', '/alojamientos']) {
    it(`permite ${ruta} a un Visitante sin sesión`, async () => {
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl(ruta, DestinoPruebaComponent);

      expect(TestBed.inject(Router).url).toBe(ruta);
    });

    it(`permite ${ruta} a un Huésped`, async () => {
      autenticado = true;
      roles = [RolUsuario.Huesped];
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl(ruta, DestinoPruebaComponent);

      expect(TestBed.inject(Router).url).toBe(ruta);
    });

    it(`redirige al Anfitrión desde ${ruta} a Mis publicaciones`, async () => {
      autenticado = true;
      roles = [RolUsuario.Anfitrion];
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl(ruta, DestinoPruebaComponent);

      expect(TestBed.inject(Router).url).toBe('/anfitrion/publicaciones');
    });

    it(`redirige al Administrador desde ${ruta} a su panel`, async () => {
      autenticado = true;
      roles = [RolUsuario.Administrador];
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl(ruta, DestinoPruebaComponent);

      expect(TestBed.inject(Router).url).toBe('/admin');
    });
  }

  it('deniega la exploración a una sesión sin rol reconocido', async () => {
    autenticado = true;
    roles = [];
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/alojamientos', DestinoPruebaComponent);

    expect(TestBed.inject(Router).url).toBe('/acceso-denegado');
  });
});
