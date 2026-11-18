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

  it('incorpora los servicios asociados al resumen público', () => {
    const recibido = jasmine.createSpy('recibido');

    repository.listar(0, 12).subscribe(recibido);

    http
      .expectOne((request) => request.url === '/api-test/alojamientos')
      .flush({
        ...paginaVacia,
        contenido: [
          {
            idPublicacion: 9,
            titulo: 'Casa en Cartagena',
            estado: 'ACTIVA',
            ciudad: { id: 3, nombre: 'Cartagena' },
            tipo: { id: 2, nombre: 'Casa' },
            capacidad: 4,
            precioNoche: 250000,
            servicios: [
              { id: 3, nombre: 'Cocina' },
              { id: 1, nombre: 'Wi-Fi' },
            ],
          },
        ],
        totalElementos: 1,
        totalPaginas: 1,
      });

    expect(recibido).toHaveBeenCalledWith(
      jasmine.objectContaining({
        contenido: [
          jasmine.objectContaining({
            idPublicacion: 9,
            servicios: [
              { id: 3, nombre: 'Cocina' },
              { id: 1, nombre: 'Wi-Fi' },
            ],
          }),
        ],
      }),
    );
  });

  it('normaliza a lista vacía los servicios ausentes del resumen', () => {
    const recibido = jasmine.createSpy('recibido');
    repository.listar(0, 12).subscribe(recibido);

    http
      .expectOne((request) => request.url === '/api-test/alojamientos')
      .flush({
        ...paginaVacia,
        contenido: [
          {
            idPublicacion: 9,
            titulo: 'Casa en Cartagena',
            estado: 'ACTIVA',
            ciudad: { id: 3, nombre: 'Cartagena' },
            tipo: { id: 2, nombre: 'Casa' },
            capacidad: 4,
            precioNoche: 250000,
          },
        ],
        totalElementos: 1,
        totalPaginas: 1,
      });

    expect(recibido).toHaveBeenCalledWith(
      jasmine.objectContaining({
        contenido: [jasmine.objectContaining({ servicios: [] })],
      }),
    );
  });

  it('consulta y transforma el detalle público con sus recursos', () => {
    const recibido = jasmine.createSpy('recibido');

    repository.obtenerDetalle(9).subscribe(recibido);

    const req = http.expectOne('/api-test/alojamientos/9');

    expect(req.request.method).toBe('GET');

    req.flush({
      idPublicacion: 9,
      titulo: 'Casa en Cartagena',
      descripcion: 'Casa luminosa con cocina.',
      estado: 'ACTIVA',
      ciudad: { id: 3, nombre: 'Cartagena' },
      barrioZona: 'Bocagrande',
      tipo: { id: 2, nombre: 'Casa' },
      capacidad: 4,
      precioNoche: 250000,
      reglas: 'No fumar.',
      politica: {
        id: 1,
        nombre: 'Flexible',
        horasAnticipacionMin: 24,
        porcentajeDevolucion: 100,
      },
      servicios: [{ id: 1, nombre: 'Wi-Fi' }],
      imagenes: [
        { orden: 2, ruta: '/referencias/segunda.jpg' },
        { orden: 1, ruta: '/referencias/primera.jpg' },
      ],
    });

    expect(recibido).toHaveBeenCalledWith({
      idPublicacion: 9,
      titulo: 'Casa en Cartagena',
      descripcion: 'Casa luminosa con cocina.',
      estado: 'ACTIVA',
      ciudad: { id: 3, nombre: 'Cartagena' },
      barrioZona: 'Bocagrande',
      tipo: { id: 2, nombre: 'Casa' },
      capacidad: 4,
      precioNoche: 250000,
      reglas: 'No fumar.',
      politica: {
        id: 1,
        nombre: 'Flexible',
        horasAnticipacionMin: 24,
        porcentajeDevolucion: 100,
      },
      servicios: [{ id: 1, nombre: 'Wi-Fi' }],
      imagenes: [
        { orden: 1, ruta: '/referencias/primera.jpg' },
        { orden: 2, ruta: '/referencias/segunda.jpg' },
      ],
    });
  });

  it('normaliza los campos opcionales y propaga el 404 del detalle', () => {
    const recibido = jasmine.createSpy('recibido');

    repository.obtenerDetalle(9).subscribe(recibido);

    http.expectOne('/api-test/alojamientos/9').flush({
      idPublicacion: 9,
      titulo: 'Casa',
      estado: 'ACTIVA',
      ciudad: { id: 3, nombre: 'Cartagena' },
      tipo: { id: 2, nombre: 'Casa' },
      capacidad: 4,
      precioNoche: 250000,
      politica: {
        id: 1,
        nombre: 'Flexible',
        horasAnticipacionMin: 24,
        porcentajeDevolucion: 100,
      },
    });

    expect(recibido).toHaveBeenCalledWith(
      jasmine.objectContaining({
        descripcion: null,
        barrioZona: null,
        reglas: null,
        servicios: [],
        imagenes: [],
      }),
    );

    const fallo = jasmine.createSpy('fallo');

    repository.obtenerDetalle(999).subscribe({ error: fallo });

    http
      .expectOne('/api-test/alojamientos/999')
      .flush(
        { mensaje: 'El alojamiento no está disponible' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(fallo).toHaveBeenCalledWith(jasmine.objectContaining({ status: 404 }));
  });
});
