import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminHomeComponent } from './admin-home.component';

describe('AdminHomeComponent', () => {
  const crear = () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminHomeComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };
  const enlace = (element: HTMLElement, href: string) =>
    element.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);

  it('muestra el título del panel', () => {
    const { element } = crear();

    expect(element.querySelector('h1')!.textContent).toContain('Administración');
  });

  it('ofrece el acceso a la gestión de publicaciones', () => {
    const { element } = crear();

    expect(enlace(element, '/admin/publicaciones')?.textContent?.trim()).toBe(
      'Gestión de publicaciones',
    );
  });

  it('ofrece el acceso "Publicaciones pendientes de revisión" a la bandeja', () => {
    const { element } = crear();

    expect(enlace(element, '/admin/publicaciones/pendientes')?.textContent?.trim()).toBe(
      'Publicaciones pendientes de revisión',
    );
  });

  it('ya no tiene el buscador por número: lo reemplazó la gestión de publicaciones', () => {
    const { element } = crear();

    expect(element.querySelector('#numeroPublicacion')).toBeNull();
    expect(element.querySelector('form')).toBeNull();
  });
});
