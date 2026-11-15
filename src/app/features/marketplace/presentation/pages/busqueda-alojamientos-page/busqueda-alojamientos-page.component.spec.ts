import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { BusquedaAlojamientosRepository } from '../../../domain/repositories/busqueda-alojamientos.repository';
import { BusquedaAlojamientosPageComponent } from './busqueda-alojamientos-page.component';
import { BusquedaAlojamientosHttpRepository } from '@features/marketplace/data/repositories/busqueda-alojamientos-http.repository';
import { provideRouter } from '@angular/router';

describe('HU-022: búsqueda pública de alojamientos', () => {
  let fixture: ComponentFixture<BusquedaAlojamientosPageComponent>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const alojamiento = {
    idPublicacion: 9,
    titulo: 'Casa en Cartagena',
    estado: 'ACTIVA',
    ciudad: { id: 3, nombre: 'Cartagena' },
    tipo: { id: 1, nombre: 'Casa' },
    capacidad: 4,
    precioNoche: 250000,
  };

  const pagina = (numero = 0, totalElementos = 1, totalPaginas = 1) => ({
    contenido: [alojamiento],
    pagina: numero,
    tamano: 12,
    totalElementos,
    totalPaginas,
    mensaje: null,
  });

  const peticion = (numero = '0') =>
    http.expectOne(
      (req) =>
        req.url === '/api-test/alojamientos' &&
        req.params.get('pagina') === numero &&
        req.params.get('tamano') === '12',
    );

  const boton = (texto: string): HTMLButtonElement => {
    const encontrado = Array.from(element.querySelectorAll('button')).find((item) =>
      item.textContent?.includes(texto),
    );

    if (!encontrado) {
      throw new Error(`No se encontró el botón ${texto}`);
    }

    return encontrado;
  };

  const responderCiudades = () =>
    http
      .expectOne((req) => req.url === '/api-test/alojamientos/ciudades')
      .flush([{ id: 3, nombre: 'Cartagena' }]);

  const seleccionar = (selector: string, valor: string, evento: 'change' | 'input') => {
    const campo = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    campo.value = valor;
    campo.dispatchEvent(new Event(evento));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BusquedaAlojamientosPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl: '/api-test' } },
        {
          provide: BusquedaAlojamientosRepository,
          useClass: BusquedaAlojamientosHttpRepository,
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BusquedaAlojamientosPageComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    responderCiudades();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('consulta sin filtros ni sesión y muestra la carga', () => {
    const req = peticion();

    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(req.request.params.keys().sort()).toEqual(['pagina', 'tamano']);
    expect(element.textContent).toContain('Cargando alojamientos');
    expect(boton('Buscar alojamientos').disabled).toBeTrue();

    req.flush(pagina());
  });

  it('muestra título, ciudad, tipo, capacidad y precio', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    expect(element.querySelectorAll('.tarjeta').length).toBe(1);
    expect(element.textContent).toContain('Casa en Cartagena');
    expect(element.textContent).toContain('Cartagena');
    expect(element.textContent).toContain('Casa');
    expect(element.textContent).toContain('4 huéspedes');
    expect(element.querySelector('.precio')?.textContent).toContain('250');
    expect(element.querySelector('.paginacion')).toBeNull();
  });

  it('informa que no hay resultados usando el mensaje del backend', () => {
    peticion().flush({
      ...pagina(0, 0, 0),
      contenido: [],
      mensaje: 'No hay alojamientos disponibles por el momento',
    });
    fixture.detectChanges();

    expect(element.querySelector('.vacio')?.textContent).toContain(
      'No hay alojamientos disponibles por el momento',
    );
    expect(element.querySelectorAll('.tarjeta').length).toBe(0);
  });

  it('usa un mensaje de respaldo si el backend no lo incluye', () => {
    peticion().flush({
      ...pagina(0, 0, 0),
      contenido: [],
    });
    fixture.detectChanges();

    expect(element.querySelector('.vacio')?.textContent).toContain(
      'No hay alojamientos disponibles por el momento',
    );
  });

  it('permite reintentar después de un error', () => {
    peticion().flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).not.toBeNull();

    boton('Reintentar').click();
    peticion().flush(pagina());
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelectorAll('.tarjeta').length).toBe(1);
  });

  it('navega entre páginas y respeta sus límites', () => {
    peticion().flush(pagina(0, 13, 2));
    fixture.detectChanges();

    expect(boton('Anterior').disabled).toBeTrue();

    boton('Siguiente').click();
    peticion('1').flush(pagina(1, 13, 2));
    fixture.detectChanges();

    expect(element.textContent).toContain('Página 2 de 2');
    expect(boton('Siguiente').disabled).toBeTrue();

    boton('Anterior').click();
    peticion().flush(pagina(0, 13, 2));
    fixture.detectChanges();

    expect(element.textContent).toContain('Página 1 de 2');
  });

  it('reintenta la página que falló, no la primera', () => {
    peticion().flush(pagina(0, 13, 2));
    fixture.detectChanges();

    boton('Siguiente').click();
    peticion('1').error(new ProgressEvent('error'));
    fixture.detectChanges();

    boton('Reintentar').click();
    peticion('1').flush(pagina(1, 13, 2));
    fixture.detectChanges();

    expect(element.textContent).toContain('Página 2 de 2');
  });

  it('recupera la última página existente cuando cambia la oferta', () => {
    peticion().flush(pagina(0, 13, 2));
    fixture.detectChanges();

    boton('Siguiente').click();
    peticion('1').flush({
      ...pagina(1, 1, 1),
      contenido: [],
    });

    peticion().flush(pagina());
    fixture.detectChanges();

    expect(element.querySelectorAll('.tarjeta').length).toBe(1);
    expect(element.querySelector('.vacio')).toBeNull();
  });

  it('aplica los filtros y consulta la primera página', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idCiudad"]', '3', 'change');
    seleccionar('input[formcontrolname="fechaLlegada"]', '2030-06-10', 'input');
    seleccionar('input[formcontrolname="fechaSalida"]', '2030-06-13', 'input');
    seleccionar('select[formcontrolname="huespedes"]', '4', 'change');
    fixture.detectChanges();

    boton('Buscar alojamientos').click();

    const consulta = http.expectOne(
      (req) =>
        req.url === '/api-test/alojamientos' &&
        req.params.get('pagina') === '0' &&
        req.params.get('tamano') === '12' &&
        req.params.get('idCiudad') === '3' &&
        req.params.get('fechaLlegada') === '2030-06-10' &&
        req.params.get('fechaSalida') === '2030-06-13' &&
        req.params.get('huespedes') === '4',
    );

    consulta.flush(pagina());
    fixture.detectChanges();

    expect(consulta.request.params.keys().sort()).toEqual([
      'fechaLlegada',
      'fechaSalida',
      'huespedes',
      'idCiudad',
      'pagina',
      'tamano',
    ]);
  });

  it('no consulta cuando el rango de fechas es inválido', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('input[formcontrolname="fechaLlegada"]', '2030-06-13', 'input');
    seleccionar('input[formcontrolname="fechaSalida"]', '2030-06-10', 'input');
    fixture.detectChanges();

    boton('Buscar alojamientos').click();
    fixture.detectChanges();

    expect(element.textContent).toContain('La salida debe ser posterior a la llegada');
  });

  it('conserva los filtros al paginar', () => {
    peticion().flush(pagina(0, 13, 2));
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idCiudad"]', '3', 'change');
    fixture.detectChanges();

    boton('Buscar alojamientos').click();

    http
      .expectOne(
        (req) =>
          req.url === '/api-test/alojamientos' &&
          req.params.get('pagina') === '0' &&
          req.params.get('idCiudad') === '3',
      )
      .flush(pagina(0, 13, 2));
    fixture.detectChanges();

    boton('Siguiente').click();

    http
      .expectOne(
        (req) =>
          req.url === '/api-test/alojamientos' &&
          req.params.get('pagina') === '1' &&
          req.params.get('idCiudad') === '3',
      )
      .flush(pagina(1, 13, 2));
    fixture.detectChanges();

    expect(element.textContent).toContain('Página 2 de 2');
  });

  it('limpia los filtros y vuelve al listado general', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idCiudad"]', '3', 'change');
    fixture.detectChanges();

    boton('Buscar alojamientos').click();

    http
      .expectOne(
        (req) => req.url === '/api-test/alojamientos' && req.params.get('idCiudad') === '3',
      )
      .flush(pagina());

    boton('Limpiar').click();

    const consulta = peticion();
    consulta.flush(pagina());
    fixture.detectChanges();

    expect(consulta.request.params.keys().sort()).toEqual(['pagina', 'tamano']);
  });
});
