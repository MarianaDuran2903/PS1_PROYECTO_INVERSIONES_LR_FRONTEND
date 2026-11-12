import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AdminHomeComponent } from './admin-home.component';

describe('AdminHomeComponent', () => {
  const crear = () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(AdminHomeComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement, router };
  };

  it('muestra el título y el buscador de publicaciones', () => {
    const { element } = crear();

    expect(element.querySelector('h1')!.textContent).toContain('Administración');
    expect(element.querySelector('app-buscador-publicacion')).not.toBeNull();
  });

  it('al elegir un número abre la intervención de esa publicación', () => {
    const { fixture, element, router } = crear();
    const input = element.querySelector<HTMLInputElement>('#numeroPublicacion')!;
    input.value = '15';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(router.navigate).toHaveBeenCalledOnceWith(['/admin', 'publicaciones', 15, 'editar']);
  });

  it('con un número inválido no navega', () => {
    const { fixture, element, router } = crear();
    const input = element.querySelector<HTMLInputElement>('#numeroPublicacion')!;
    input.value = 'abc';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
