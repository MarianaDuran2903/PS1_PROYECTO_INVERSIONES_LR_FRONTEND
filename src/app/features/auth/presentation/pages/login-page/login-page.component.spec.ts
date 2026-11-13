import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { environment } from '@env/environment';
import { AuthRepository } from '../../../domain/repositories/auth.repository';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  it('ofrece el enlace "¿Olvidaste tu contraseña?" que lleva a /recuperar-contrasena (HU-004)', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...environment, logLevel: 'error' } },
        {
          provide: AuthRepository,
          useValue: jasmine.createSpyObj<AuthRepository>('AuthRepository', ['iniciarSesion']),
        },
      ],
    });
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    const enlace = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a[href="/recuperar-contrasena"]',
    );
    expect(enlace?.textContent).toContain('¿Olvidaste tu contraseña?');
  });
});
