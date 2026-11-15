import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { BusquedaAlojamientosHttpRepository } from '../../../data/repositories/busqueda-alojamientos-http.repository';
import { BusquedaAlojamientosRepository } from '../../../domain/repositories/busqueda-alojamientos.repository';
import { BusquedaAlojamientosPageComponent } from './busqueda-alojamientos-page.component';

describe('HU-024: entrada desde una categoría de inicio', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<BusquedaAlojamientosPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BusquedaAlojamientosPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl: '/api-test' } },
        {
          provide: BusquedaAlojamientosRepository,
          useClass: BusquedaAlojamientosHttpRepository,
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ idTipo: '42' }),
            },
          },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BusquedaAlojamientosPageComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('consulta el tipo de la URL y lo muestra seleccionado', () => {
    const consulta = http.expectOne((request) => request.url === '/api-test/alojamientos');

    expect(consulta.request.params.get('idTipo')).toBe('42');
    expect(consulta.request.params.get('pagina')).toBe('0');

    consulta.flush({
      contenido: [],
      pagina: 0,
      tamano: 12,
      totalElementos: 0,
      totalPaginas: 0,
      mensaje: 'No hay coincidencias',
    });

    http.expectOne('/api-test/alojamientos/ciudades').flush([]);

    http.expectOne('/api-test/catalogos/tipos-alojamiento').flush([{ id: 42, nombre: 'Casa' }]);

    http.expectOne('/api-test/catalogos/servicios').flush([]);

    fixture.detectChanges();

    const selector = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      'select[formcontrolname="idTipo"]',
    );

    expect(selector).not.toBeNull();
    expect(selector?.value).toBe('42');
  });
});
