import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { BusquedaAlojamientosFacade } from '@features/marketplace/application/busqueda-alojamientos.facade';
import { BusquedaAlojamientosRepository } from '@features/marketplace/domain/repositories/busqueda-alojamientos.repository';
import { BarraBusquedaAlojamientosComponent } from '@shared/ui/barra-busqueda-alojamientos/barra-busqueda-alojamientos.component';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  let repository: jasmine.SpyObj<BusquedaAlojamientosRepository>;

  beforeEach(() => {
    repository = jasmine.createSpyObj<BusquedaAlojamientosRepository>(
      'BusquedaAlojamientosRepository',
      ['listar', 'listarCiudades'],
    );

    repository.listarCiudades.and.returnValue(of([{ id: 3, nombre: 'Cartagena' }]));

    TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [provideRouter([])],
    });

    TestBed.overrideComponent(HomePageComponent, {
      set: {
        providers: [
          BusquedaAlojamientosFacade,
          {
            provide: BusquedaAlojamientosRepository,
            useValue: repository,
          },
        ],
      },
    });
  });

  it('dirige a buscar alojamiento y a publicar como anfitrión', () => {
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

  it('muestra las categorías y carga destinos sin consultar alojamientos', () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const titulos = Array.from(element.querySelectorAll('.categoria h3')).map((item) =>
      item.textContent?.trim(),
    );

    expect(titulos).toEqual(['Cabañas', 'Casas', 'Apartamentos', 'Habitaciones']);
    expect(element.querySelectorAll('.categoria img').length).toBe(4);
    expect(
      element.querySelector<HTMLSelectElement>('select[formcontrolname="idCiudad"]')?.textContent,
    ).toContain('Cartagena');
    expect(repository.listarCiudades).toHaveBeenCalledTimes(1);
    expect(repository.listar).not.toHaveBeenCalled();
  });

  it('envía los filtros de inicio a la página de alojamientos', () => {
    const router = TestBed.inject(Router);
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const barra = fixture.debugElement.query(By.directive(BarraBusquedaAlojamientosComponent))
      .componentInstance as BarraBusquedaAlojamientosComponent;

    const filtros = {
      idCiudad: 3,
      fechaLlegada: '2026-12-10',
      fechaSalida: '2026-12-13',
      huespedes: 4,
    };

    barra.buscar.emit(filtros);

    expect(navegar).toHaveBeenCalledWith(['/alojamientos'], {
      queryParams: filtros,
    });
  });
});
