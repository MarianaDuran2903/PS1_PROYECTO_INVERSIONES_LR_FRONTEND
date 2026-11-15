import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { BusquedaAlojamientosRepository } from '../../../domain/repositories/busqueda-alojamientos.repository';
import { BusquedaAlojamientosPageComponent } from './busqueda-alojamientos-page.component';
import { BusquedaAlojamientosHttpRepository } from '@features/marketplace/data/repositories/busqueda-alojamientos-http.repository';

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
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BusquedaAlojamientosPageComponent);
    element = fixture.nativeElement as HTMLElement;
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

  it('buscar nuevamente vuelve a consultar la primera página', () => {
    peticion().flush(pagina());
    fixture.detectChanges();

    boton('Buscar alojamientos').click();
    peticion().flush(pagina());
    fixture.detectChanges();

    expect(element.querySelectorAll('.tarjeta').length).toBe(1);
  });
});
