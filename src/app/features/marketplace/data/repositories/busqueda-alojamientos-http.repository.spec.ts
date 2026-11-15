import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { BusquedaAlojamientosHttpRepository } from './busqueda-alojamientos-http.repository';

describe('BusquedaAlojamientosHttpRepository: HU-024', () => {
  let repository: BusquedaAlojamientosHttpRepository;
  let http: HttpTestingController;

  const paginaVacia = {
    contenido: [],
    pagina: 0,
    tamano: 12,
    totalElementos: 0,
    totalPaginas: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BusquedaAlojamientosHttpRepository,
        { provide: APP_CONFIG, useValue: { apiUrl: '/api-test' } },
      ],
    });

    repository = TestBed.inject(BusquedaAlojamientosHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('combina los filtros y repite los servicios sin duplicarlos', () => {
    repository
      .listar(0, 12, {
        idCiudad: 3,
        fechaLlegada: '2030-06-10',
        fechaSalida: '2030-06-13',
        huespedes: 4,
        idTipo: 2,
        precioMinimo: 0,
        precioMaximo: 300000,
        idsServicios: [1, 3, 1],
      })
      .subscribe();

    const req = http.expectOne((request) => request.url === '/api-test/alojamientos');

    expect(req.request.params.get('idCiudad')).toBe('3');
    expect(req.request.params.get('fechaLlegada')).toBe('2030-06-10');
    expect(req.request.params.get('fechaSalida')).toBe('2030-06-13');
    expect(req.request.params.get('huespedes')).toBe('4');
    expect(req.request.params.get('idTipo')).toBe('2');
    expect(req.request.params.get('precioMinimo')).toBe('0');
    expect(req.request.params.get('precioMaximo')).toBe('300000');
    expect(req.request.params.getAll('idsServicios')).toEqual(['1', '3']);

    req.flush(paginaVacia);
  });

  it('omite las características cuando no se seleccionan', () => {
    repository.listar(0, 12, { idsServicios: [] }).subscribe();

    const req = http.expectOne((request) => request.url === '/api-test/alojamientos');

    expect(req.request.params.keys().sort()).toEqual(['pagina', 'tamano']);

    req.flush(paginaVacia);
  });

  it('consulta tipos usando el catálogo público', () => {
    const respuesta = [{ id: 2, nombre: 'Casa' }];
    const recibido = jasmine.createSpy('recibido');

    repository.listarTiposAlojamiento().subscribe(recibido);

    const req = http.expectOne('/api-test/catalogos/tipos-alojamiento');
    expect(req.request.method).toBe('GET');
    req.flush(respuesta);

    expect(recibido).toHaveBeenCalledWith(respuesta);
  });

  it('consulta servicios usando el catálogo público', () => {
    const respuesta = [{ id: 1, nombre: 'Wi-Fi' }];
    const recibido = jasmine.createSpy('recibido');

    repository.listarServicios().subscribe(recibido);

    const req = http.expectOne('/api-test/catalogos/servicios');
    expect(req.request.method).toBe('GET');
    req.flush(respuesta);

    expect(recibido).toHaveBeenCalledWith(respuesta);
  });
});
