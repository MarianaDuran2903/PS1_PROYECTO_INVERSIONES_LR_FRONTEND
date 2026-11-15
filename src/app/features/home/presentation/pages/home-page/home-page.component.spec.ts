import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  it('dirige a buscar alojamiento y a publicar como anfitrión', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const enlaces = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    );
    const hrefs = Object.fromEntries(
      enlaces.map((a) => [a.textContent!.trim(), a.getAttribute('href')]),
    );

    expect(hrefs['Buscar alojamiento']).toBe('/alojamientos');
    expect(hrefs['Publicar alojamiento']).toBe('/registro?rol=anfitrion');
    expect(fixture.nativeElement.querySelector('h1')!.textContent).toContain('bajar el ritmo');
  });

  it('muestra las cuatro categorías y mantiene los filtros deshabilitados', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const titulos = Array.from(element.querySelectorAll('.categoria h3')).map((item) =>
      item.textContent?.trim(),
    );

    expect(titulos).toEqual(['Cabañas', 'Casas', 'Apartamentos', 'Habitaciones']);
    expect(element.querySelector<HTMLFieldSetElement>('fieldset')?.disabled).toBeTrue();
    expect(element.querySelectorAll('.categoria img').length).toBe(4);
  });
});
