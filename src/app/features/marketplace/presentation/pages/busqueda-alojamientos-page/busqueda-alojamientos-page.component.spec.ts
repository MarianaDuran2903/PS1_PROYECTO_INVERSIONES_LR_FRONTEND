import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { BusquedaAlojamientosHttpRepository } from '../../../data/repositories/busqueda-alojamientos-http.repository';
import { BusquedaAlojamientosRepository } from '../../../domain/repositories/busqueda-alojamientos.repository';
import { BusquedaAlojamientosPageComponent } from './busqueda-alojamientos-page.component';

describe('HU-022, HU-023 y HU-024: búsqueda pública de alojamientos', () => {
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

  const seleccionar = (selector: string, valor: string, evento: 'change' | 'input'): void => {
    const campo = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector);

    if (!campo) {
      throw new Error(`No se encontró el campo ${selector}`);
    }

    campo.value = valor;
    campo.dispatchEvent(new Event(evento));
  };

  const responderCatalogos = (): void => {
    http.expectOne('/api-test/alojamientos/ciudades').flush([{ id: 3, nombre: 'Cartagena' }]);

    http.expectOne('/api-test/catalogos/tipos-alojamiento').flush([
      { id: 1, nombre: 'Casa' },
      { id: 2, nombre: 'Apartamento' },
    ]);

    http.expectOne('/api-test/catalogos/servicios').flush([
      { id: 1, nombre: 'Wi-Fi' },
      { id: 3, nombre: 'Cocina' },
    ]);
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
    responderCatalogos();
    fixture.detectChanges();
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

  it('aplica ubicación, fechas y huéspedes desde la primera página', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idCiudad"]', '3', 'change');
    seleccionar('input[formcontrolname="fechaLlegada"]', '2030-06-10', 'input');
    seleccionar('input[formcontrolname="fechaSalida"]', '2030-06-13', 'input');
    seleccionar('select[formcontrolname="huespedes"]', '4', 'change');
    fixture.detectChanges();

    boton('Buscar alojamientos').click();

    const consulta = peticion();

    expect(consulta.request.params.get('idCiudad')).toBe('3');
    expect(consulta.request.params.get('fechaLlegada')).toBe('2030-06-10');
    expect(consulta.request.params.get('fechaSalida')).toBe('2030-06-13');
    expect(consulta.request.params.get('huespedes')).toBe('4');
    expect(consulta.request.params.keys().sort()).toEqual([
      'fechaLlegada',
      'fechaSalida',
      'huespedes',
      'idCiudad',
      'pagina',
      'tamano',
    ]);

    consulta.flush(pagina());
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
    http.expectNone((request) => request.url === '/api-test/alojamientos');
  });

  it('conserva los filtros de ubicación al paginar', () => {
    peticion().flush(pagina(0, 13, 2));
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idCiudad"]', '3', 'change');
    fixture.detectChanges();

    boton('Buscar alojamientos').click();

    const primera = peticion();
    expect(primera.request.params.get('idCiudad')).toBe('3');
    primera.flush(pagina(0, 13, 2));
    fixture.detectChanges();

    boton('Siguiente').click();

    const segunda = peticion('1');
    expect(segunda.request.params.get('idCiudad')).toBe('3');
    segunda.flush(pagina(1, 13, 2));
    fixture.detectChanges();

    expect(element.textContent).toContain('Página 2 de 2');
  });

  it('limpia los filtros y vuelve al listado general', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idCiudad"]', '3', 'change');
    fixture.detectChanges();

    boton('Buscar alojamientos').click();

    const filtrada = peticion();
    expect(filtrada.request.params.get('idCiudad')).toBe('3');
    filtrada.flush(pagina());
    fixture.detectChanges();

    boton('Limpiar').click();

    const consulta = peticion();
    expect(consulta.request.params.keys().sort()).toEqual(['pagina', 'tamano']);
    consulta.flush(pagina());
    fixture.detectChanges();
  });

  it('aplica tipo, precios y todos los servicios seleccionados', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idTipo"]', '2', 'change');
    seleccionar('input[formcontrolname="precioMinimo"]', '100000', 'input');
    seleccionar('input[formcontrolname="precioMaximo"]', '300000', 'input');

    for (const id of [1, 3]) {
      const checkbox = element.querySelector<HTMLInputElement>(`[data-servicio-id="${id}"]`)!;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
    }

    fixture.detectChanges();
    boton('Aplicar características').click();

    const req = peticion();

    expect(req.request.params.get('idTipo')).toBe('2');
    expect(req.request.params.get('precioMinimo')).toBe('100000');
    expect(req.request.params.get('precioMaximo')).toBe('300000');
    expect(req.request.params.getAll('idsServicios')).toEqual(['1', '3']);

    req.flush(pagina());
  });

  it('no consulta con un rango de precios invertido', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('input[formcontrolname="precioMinimo"]', '300000', 'input');
    seleccionar('input[formcontrolname="precioMaximo"]', '100000', 'input');
    fixture.detectChanges();

    boton('Aplicar características').click();
    fixture.detectChanges();

    expect(element.textContent).toContain('El precio máximo debe ser mayor o igual al mínimo');
    http.expectNone((request) => request.url === '/api-test/alojamientos');
  });

  it('conserva ciudad al aplicar características y conserva tipo al buscar', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idCiudad"]', '3', 'change');
    fixture.detectChanges();
    boton('Buscar alojamientos').click();

    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idTipo"]', '2', 'change');
    fixture.detectChanges();
    boton('Aplicar características').click();

    const conCaracteristicas = peticion();
    expect(conCaracteristicas.request.params.get('idCiudad')).toBe('3');
    expect(conCaracteristicas.request.params.get('idTipo')).toBe('2');
    conCaracteristicas.flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="huespedes"]', '4', 'change');
    fixture.detectChanges();
    boton('Buscar alojamientos').click();

    const combinada = peticion();
    expect(combinada.request.params.get('idCiudad')).toBe('3');
    expect(combinada.request.params.get('huespedes')).toBe('4');
    expect(combinada.request.params.get('idTipo')).toBe('2');
    combinada.flush(pagina());
  });

  it('conserva las características al paginar y reintentar', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idTipo"]', '2', 'change');
    fixture.detectChanges();
    boton('Aplicar características').click();

    peticion().flush(pagina(0, 13, 2));
    fixture.detectChanges();

    boton('Siguiente').click();

    const siguiente = peticion('1');
    expect(siguiente.request.params.get('idTipo')).toBe('2');
    siguiente.flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    boton('Reintentar').click();

    const reintento = peticion('1');
    expect(reintento.request.params.get('idTipo')).toBe('2');
    reintento.flush(pagina(1, 13, 2));
  });

  it('limpiar características conserva la ciudad', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idCiudad"]', '3', 'change');
    fixture.detectChanges();
    boton('Buscar alojamientos').click();
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idTipo"]', '2', 'change');
    fixture.detectChanges();
    boton('Aplicar características').click();
    peticion().flush(pagina());
    fixture.detectChanges();

    boton('Limpiar características').click();

    const req = peticion();

    expect(req.request.params.get('idCiudad')).toBe('3');
    expect(req.request.params.has('idTipo')).toBeFalse();
    expect(req.request.params.has('precioMinimo')).toBeFalse();
    expect(req.request.params.has('precioMaximo')).toBeFalse();
    expect(req.request.params.has('idsServicios')).toBeFalse();

    req.flush(pagina());
  });

  it('muestra el mensaje de ausencia de coincidencias con características', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('input[formcontrolname="precioMaximo"]', '100', 'input');
    fixture.detectChanges();
    boton('Aplicar características').click();

    peticion().flush({
      ...pagina(0, 0, 0),
      contenido: [],
      mensaje: 'No hay alojamientos que coincidan con los filtros seleccionados',
    });
    fixture.detectChanges();

    expect(element.querySelector('.vacio')?.textContent).toContain(
      'No hay alojamientos que coincidan con los filtros seleccionados',
    );
  });

  it('muestra una imagen de referencia según el tipo de alojamiento', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    const imagen = element.querySelector<HTMLImageElement>('.tarjeta__imagen');

    expect(imagen?.getAttribute('src')).toBe('/img/imgCasas.jpg');
    expect(element.querySelector('.tarjeta__referencia')?.textContent).toContain(
      'Imagen de referencia',
    );
  });

  it('usa la imagen general si falla la imagen del tipo', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    const imagen = element.querySelector<HTMLImageElement>('.tarjeta__imagen')!;

    imagen.dispatchEvent(new Event('error'));

    expect(imagen.getAttribute('src')).toBe('/img/imgHero.jpg');

    imagen.dispatchEvent(new Event('error'));

    expect(imagen.hidden).toBeTrue();
  });

  it('muestra los servicios asociados y enlaza al detalle público', () => {
    peticion().flush({
      ...pagina(),
      contenido: [
        {
          ...alojamiento,
          servicios: [
            { id: 3, nombre: 'Cocina' },
            { id: 1, nombre: 'Wi-Fi' },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const servicios = element.querySelector('.tarjeta__servicios');
    const enlace = element.querySelector<HTMLAnchorElement>('.tarjeta__enlace')!;

    expect(servicios?.textContent).toContain('Cocina');
    expect(servicios?.textContent).toContain('Wi-Fi');

    const url = new URL(enlace.href);

    expect(url.pathname).toBe('/alojamientos/9');
    expect(url.searchParams.get('pagina')).toBe('0');
    expect(enlace.textContent).toContain('Ver alojamiento');
  });

  it('el enlace al detalle conserva los filtros aplicados', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idCiudad"]', '3', 'change');
    fixture.detectChanges();

    boton('Buscar alojamientos').click();
    peticion().flush(pagina());
    fixture.detectChanges();

    seleccionar('select[formcontrolname="idTipo"]', '2', 'change');
    fixture.detectChanges();

    boton('Aplicar características').click();
    peticion().flush(pagina());
    fixture.detectChanges();

    const enlace = element.querySelector<HTMLAnchorElement>('.tarjeta__enlace')!;
    const url = new URL(enlace.href);

    expect(url.searchParams.get('idCiudad')).toBe('3');
    expect(url.searchParams.get('idTipo')).toBe('2');
  });
});
