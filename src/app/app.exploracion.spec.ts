import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { environment } from '@env/environment';
import { SESSION_STORAGE_KEY, SessionService } from '@features/auth/application/session.service';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { AppComponent } from './app.component';

describe('AppComponent: navegación de exploración por rol', () => {
  let fixture: ComponentFixture<AppComponent>;
  let session: SessionService;

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        {
          provide: APP_CONFIG,
          useValue: { ...environment, logLevel: 'error' },
        },
      ],
    });

    session = TestBed.inject(SessionService);
    fixture = TestBed.createComponent(AppComponent);
  });

  afterEach(() => {
    fixture.destroy();
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  const iniciarComo = (rol: RolUsuario): void => {
    session.iniciar({
      accessToken: 'token-prueba',
      expiraEn: Date.now() + 3_600_000,
      usuario: {
        idUsuario: 1,
        primerNombre: 'Ana',
        primerApellido: 'Ruiz',
        correo: 'ana@example.com',
        roles: [rol],
      },
    });
  };

  const enlacesPrincipales = (): string[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.nav a')).map(
      (enlace) => enlace.textContent?.trim() ?? '',
    );

  const destinoLogo = (): string | null =>
    (fixture.nativeElement as HTMLElement).querySelector('.brand')?.getAttribute('href') ?? null;

  it('muestra Explorar al Visitante', () => {
    fixture.detectChanges();

    expect(enlacesPrincipales()).toContain('Explorar');
    expect(destinoLogo()).toBe('/');
  });

  it('muestra Explorar al Huésped', () => {
    iniciarComo(RolUsuario.Huesped);
    fixture.detectChanges();

    expect(enlacesPrincipales()).toContain('Explorar');
    expect(destinoLogo()).toBe('/');
  });

  it('oculta Explorar al Anfitrión y dirige el logo a Mis publicaciones', () => {
    iniciarComo(RolUsuario.Anfitrion);
    fixture.detectChanges();

    expect(enlacesPrincipales()).not.toContain('Explorar');
    expect(enlacesPrincipales()).toContain('Mis publicaciones');
    expect(destinoLogo()).toBe('/anfitrion/publicaciones');
  });

  it('oculta Explorar al Administrador y dirige el logo a administración', () => {
    iniciarComo(RolUsuario.Administrador);
    fixture.detectChanges();

    expect(enlacesPrincipales()).not.toContain('Explorar');
    expect(enlacesPrincipales()).toContain('Administración');
    expect(destinoLogo()).toBe('/admin');
  });

  it('recupera Explorar al cerrar la sesión', () => {
    iniciarComo(RolUsuario.Anfitrion);
    fixture.detectChanges();

    session.cerrar();
    fixture.detectChanges();

    expect(enlacesPrincipales()).toContain('Explorar');
    expect(destinoLogo()).toBe('/');
  });
});
