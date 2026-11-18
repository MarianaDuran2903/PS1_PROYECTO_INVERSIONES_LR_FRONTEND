import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { BusquedaAlojamientosHttpRepository } from '../data/repositories/busqueda-alojamientos-http.repository';
import { BusquedaAlojamientosRepository } from '../domain/repositories/busqueda-alojamientos.repository';
import { AlojamientoDetalleFacade } from './alojamiento-detalle.facade';

describe('AlojamientoDetalleFacade: peticiones y navegación', () => {
  let facade: AlojamientoDetalleFacade;
  let http: HttpTestingController;

  const detalle = {
    idPublicacion: 10,
    titulo: 'Segundo alojamiento',
    descripcion: 'Descripción de prueba',
    estado: 'ACTIVA',
    ciudad: { id: 3, nombre: 'Cartagena' },
    barrioZona: 'Bocagrande',
    tipo: { id: 2, nombre: 'Casa' },
    capacidad: 4,
    precioNoche: 250000,
    reglas: 'No fumar',
    politica: {
      id: 1,
      nombre: 'Flexible',
      horasAnticipacionMin: 24,
      porcentajeDevolucion: 100,
    },
    servicios: [],
    imagenes: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AlojamientoDetalleFacade,
        {
          provide: APP_CONFIG,
          useValue: { apiUrl: '/api-test' },
        },
        {
          provide: BusquedaAlojamientosRepository,
          useClass: BusquedaAlojamientosHttpRepository,
        },
      ],
    });

    facade = TestBed.inject(AlojamientoDetalleFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('cancela la petición anterior al consultar otro alojamiento', () => {
    facade.cargar('9');
    const anterior = http.expectOne('/api-test/alojamientos/9');

    facade.cargar('10');

    expect(anterior.cancelled).toBeTrue();
    expect(facade.estado()).toBe('cargando');
    expect(facade.alojamiento()).toBeNull();

    http.expectOne('/api-test/alojamientos/10').flush(detalle);

    expect(facade.estado()).toBe('listo');
    expect(facade.alojamiento()?.idPublicacion).toBe(10);
  });

  it('cancela la petición pendiente si el nuevo identificador es inválido', () => {
    facade.cargar('9');
    const anterior = http.expectOne('/api-test/alojamientos/9');

    facade.cargar('abc');

    expect(anterior.cancelled).toBeTrue();
    expect(facade.estado()).toBe('no-disponible');
    expect(facade.alojamiento()).toBeNull();

    http.expectNone('/api-test/alojamientos/abc');
  });
});
