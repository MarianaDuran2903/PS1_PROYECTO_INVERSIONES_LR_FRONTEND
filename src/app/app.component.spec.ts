import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { environment } from '@env/environment';
import { SESSION_STORAGE_KEY, SessionService } from '@features/auth/application/session.service';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { AppComponent } from './app.component';

@Component({ template: '' })
class PaginaStub {}

describe('AppComponent: menú y barra inferior según el rol', () => {
  let fixture: ComponentFixture<AppComponent>;
  let session: SessionService;

  const iniciarSesionCon = (rol: RolUsuario) =>
    session.iniciar({
      accessToken: 't',
      expiraEn: Date.now() + 3_600_000,
      usuario: {
        idUsuario: 1,
        primerNombre: 'Ana',
        primerApellido: 'Ruiz',
        correo: 'a@b.co',
        roles: [rol],
      },
    });
  const raiz = () => fixture.nativeElement as HTMLElement;
  /** Enlaces del menú superior (con texto). */
  const enlacesDelMenu = () =>
    Array.from(raiz().querySelectorAll<HTMLAnchorElement>('.nav a')).map(
      (a) => [a.textContent!.trim(), a.getAttribute('href')] as const,
    );
  const barraInferior = () => raiz().querySelector('.barra-inferior');
  /** Botones de la barra inferior, de izquierda a derecha. */
  const botonesDeLaBarra = () =>
    Array.from(raiz().querySelectorAll<HTMLAnchorElement>('.barra-inferior a')).map((a) => ({
      nombre: a.getAttribute('aria-label'),
      href: a.getAttribute('href'),
      principal: a.classList.contains('barra-inferior__boton--principal'),
    }));
  const crear = () => {
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  };

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: PaginaStub }]),
        { provide: APP_CONFIG, useValue: { ...environment, logLevel: 'error' } },
      ],
    });
    session = TestBed.inject(SessionService);
  });

  afterEach(() => {
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  describe('Anfitrión', () => {
    beforeEach(() => {
      iniciarSesionCon('ANFITRION');
      crear();
    });

    it('el menú superior tiene "Mi panel" y "Mis publicaciones", pero NO "Nueva publicación"', () => {
      const nombres = enlacesDelMenu().map(([nombre]) => nombre);

      expect(enlacesDelMenu()).toEqual(
        jasmine.arrayContaining([
          ['Mi panel', '/anfitrion'],
          ['Mis publicaciones', '/anfitrion/publicaciones'],
        ]),
      );
      expect(nombres).not.toContain('Nueva publicación');
    });

    it('muestra una barra inferior con tres botones circulares', () => {
      expect(barraInferior()).not.toBeNull();
      expect(botonesDeLaBarra().length).toBe(3);
    });

    it('el "+" de "Nueva publicación" está en el centro y es el botón principal', () => {
      const botones = botonesDeLaBarra();

      expect(botones[1]).toEqual({
        nombre: 'Nueva publicación',
        href: '/anfitrion/publicaciones/nueva',
        principal: true,
      });
      expect(botones.filter((b) => b.principal).length).toBe(1);
      expect(
        raiz().querySelector('.barra-inferior__boton--principal path')!.getAttribute('d'),
      ).toBe('M12 5v14M5 12h14');
    });

    it('los otros dos botones llevan al listado y al panel', () => {
      const botones = botonesDeLaBarra();

      expect(botones[0]).toEqual(
        jasmine.objectContaining({ nombre: 'Mis publicaciones', href: '/anfitrion/publicaciones' }),
      );
      expect(botones[2]).toEqual(
        jasmine.objectContaining({ nombre: 'Mi panel', href: '/anfitrion' }),
      );
    });

    it('cada botón tiene nombre accesible y tooltip, aunque solo muestre un icono', () => {
      for (const boton of Array.from(raiz().querySelectorAll('.barra-inferior a'))) {
        expect(boton.getAttribute('aria-label')).toBeTruthy();
        expect(boton.getAttribute('title')).toBe(boton.getAttribute('aria-label'));
        expect(boton.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
      }
    });

    it('deja espacio al final de la página para que la barra no tape el contenido', () => {
      expect(raiz().querySelector('.app-main')!.classList).toContain('app-main--con-barra');
    });

    it('"Mis publicaciones" del menú solo se marca activa en el listado, no en nueva', async () => {
      const router = TestBed.inject(Router);
      const activosDelMenu = () =>
        Array.from(raiz().querySelectorAll<HTMLElement>('.nav a.nav__link--active')).map((a) =>
          a.textContent!.trim(),
        );

      await router.navigateByUrl('/anfitrion/publicaciones');
      fixture.detectChanges();
      expect(activosDelMenu()).toContain('Mis publicaciones');

      await router.navigateByUrl('/anfitrion/publicaciones/nueva');
      fixture.detectChanges();
      expect(activosDelMenu()).not.toContain('Mis publicaciones');
    });

    it('en la pantalla de nueva publicación se marca el botón "+" de la barra', async () => {
      await TestBed.inject(Router).navigateByUrl('/anfitrion/publicaciones/nueva');
      fixture.detectChanges();

      const activos = Array.from(
        raiz().querySelectorAll<HTMLElement>('.barra-inferior a.barra-inferior__boton--activo'),
      ).map((a) => a.getAttribute('aria-label'));
      expect(activos).toEqual(['Nueva publicación']);
    });
  });

  for (const rol of ['HUESPED', 'ADMINISTRADOR'] as const) {
    it(`un ${rol} no ve la barra inferior ni las opciones del Anfitrión`, () => {
      iniciarSesionCon(rol);

      crear();

      expect(barraInferior()).toBeNull();
      const nombres = enlacesDelMenu().map(([nombre]) => nombre);
      expect(nombres).not.toContain('Mis publicaciones');
      expect(nombres).not.toContain('Nueva publicación');
      expect(raiz().querySelector('.app-main')!.classList).not.toContain('app-main--con-barra');
    });
  }

  it('sin sesión tampoco aparece la barra inferior', () => {
    crear();

    expect(barraInferior()).toBeNull();
    const nombres = enlacesDelMenu().map(([nombre]) => nombre);
    expect(nombres).not.toContain('Mis publicaciones');
    expect(nombres).not.toContain('Nueva publicación');
  });

  it('al cerrar sesión la barra desaparece', () => {
    iniciarSesionCon('ANFITRION');
    crear();
    expect(barraInferior()).not.toBeNull();

    session.cerrar();
    fixture.detectChanges();

    expect(barraInferior()).toBeNull();
  });
});
