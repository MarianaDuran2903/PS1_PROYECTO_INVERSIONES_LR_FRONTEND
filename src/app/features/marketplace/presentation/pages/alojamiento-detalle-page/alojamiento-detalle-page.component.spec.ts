import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { BehaviorSubject } from 'rxjs';
import { BusquedaAlojamientosHttpRepository } from '../../../data/repositories/busqueda-alojamientos-http.repository';
import { BusquedaAlojamientosRepository } from '../../../domain/repositories/busqueda-alojamientos.repository';
import { AlojamientoDetallePageComponent } from './alojamiento-detalle-page.component';

describe('HU-025: detalle público de alojamiento', () => {
  let fixture: ComponentFixture<AlojamientoDetallePageComponent>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const parametros = new BehaviorSubject(convertToParamMap({ idPublicacion: '9' }));

  const detalle = {
    idPublicacion: 9,
    titulo: 'Casa en Cartagena',
    descripcion: 'Una casa luminosa.',
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
    imagenes: [],
  };

  beforeEach(() => {
    parametros.next(convertToParamMap({ idPublicacion: '9' }));

    TestBed.configureTestingModule({
      imports: [AlojamientoDetallePageComponent],
      providers: [
        provideRouter([]),
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
            paramMap: parametros.asObservable(),
            snapshot: {
              queryParamMap: convertToParamMap({
                pagina: '2',
                idCiudad: '3',
                idTipo: '2',
                idsServicios: ['1', '3'],
              }),
            },
          },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AlojamientoDetallePageComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('muestra carga y luego la información pública y la referencia', () => {
    expect(element.textContent).toContain('Cargando alojamiento');

    http.expectOne('/api-test/alojamientos/9').flush(detalle);
    fixture.detectChanges();

    expect(element.querySelector('h1')?.textContent).toContain('Casa en Cartagena');
    expect(element.textContent).toContain('Una casa luminosa.');
    expect(element.textContent).toContain('Bocagrande');
    expect(element.textContent).toContain('4 huéspedes');
    expect(element.textContent).toContain('Wi-Fi');
    expect(element.textContent).toContain('No fumar.');
    expect(element.textContent).toContain('Flexible');
    expect(element.textContent).toContain('Imagen de referencia');
    expect(element.textContent).toContain('Fechas disponibles');
    expect(element.textContent).toContain('Demo');
    expect(element.textContent).toContain('No se ha consultado la disponibilidad');
    expect(element.querySelector<HTMLButtonElement>('.cotizar')?.disabled).toBeTrue();

    const imagen = element.querySelector<HTMLImageElement>('.galeria img');
    expect(imagen?.getAttribute('src')).toBe('/img/imgCasas.jpg');
  });

  it('conserva página y filtros en el enlace de regreso', () => {
    http.expectOne('/api-test/alojamientos/9').flush(detalle);
    fixture.detectChanges();

    const enlace = element.querySelector<HTMLAnchorElement>('.volver')!;
    const url = new URL(enlace.href);

    expect(url.pathname).toBe('/alojamientos');
    expect(url.searchParams.get('pagina')).toBe('2');
    expect(url.searchParams.get('idCiudad')).toBe('3');
    expect(url.searchParams.get('idTipo')).toBe('2');
    expect(url.searchParams.getAll('idsServicios')).toEqual(['1', '3']);
  });

  it('muestra no disponible ante un 404, sin botón de reintento', () => {
    http
      .expectOne('/api-test/alojamientos/9')
      .flush(
        { mensaje: 'El alojamiento no está disponible' },
        { status: 404, statusText: 'Not Found' },
      );
    fixture.detectChanges();

    expect(element.textContent).toContain('Alojamiento no disponible');
    expect(element.querySelector('button')).toBeNull();
    expect(element.textContent).not.toContain('Casa en Cartagena');
  });

  it('permite reintentar después de un fallo del servidor', () => {
    http.expectOne('/api-test/alojamientos/9').flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).not.toBeNull();

    element.querySelector<HTMLButtonElement>('button')!.click();

    http.expectOne('/api-test/alojamientos/9').flush(detalle);
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.textContent).toContain('Casa en Cartagena');
  });

  it('no consulta identificadores inválidos y retira el detalle anterior', () => {
    http.expectOne('/api-test/alojamientos/9').flush(detalle);
    fixture.detectChanges();

    parametros.next(convertToParamMap({ idPublicacion: 'abc' }));
    fixture.detectChanges();

    http.expectNone((request) => request.url.startsWith('/api-test/alojamientos/'));
    expect(element.textContent).toContain('Alojamiento no disponible');
    expect(element.textContent).not.toContain('Casa en Cartagena');
  });

  it('muestra imágenes configuradas y oculta una imagen que falla', () => {
    http.expectOne('/api-test/alojamientos/9').flush({
      ...detalle,
      imagenes: [{ orden: 1, ruta: '/referencias/casa.jpg' }],
    });
    fixture.detectChanges();

    const imagen = element.querySelector<HTMLImageElement>('.galeria img')!;

    expect(imagen.getAttribute('src')).toBe('/referencias/casa.jpg');
    expect(element.textContent).not.toContain('No es una fotografía de esta publicación');

    imagen.dispatchEvent(new Event('error'));

    expect(imagen.hidden).toBeTrue();
  });

  it('permite editar la estancia sin consultar disponibilidad ni cotizar', () => {
    http.expectOne('/api-test/alojamientos/9').flush(detalle);
    fixture.detectChanges();

    const llegada = element.querySelector<HTMLInputElement>('#estancia-llegada')!;
    const salida = element.querySelector<HTMLInputElement>('#estancia-salida')!;
    const huespedes = element.querySelector<HTMLInputElement>('#estancia-huespedes')!;

    llegada.value = '2030-06-10';
    llegada.dispatchEvent(new Event('input'));

    salida.value = '2030-06-13';
    salida.dispatchEvent(new Event('input'));

    huespedes.value = '2';
    huespedes.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    expect(element.querySelector('.estancia-seleccionada')?.textContent).toContain('3 noches');
    expect(element.querySelector('.estancia-seleccionada')?.textContent).toContain('2');

    expect(element.querySelector<HTMLButtonElement>('.cotizar')?.disabled).toBeTrue();

    http.expectNone((request) => request.url.startsWith('/api-test/'));
  });

  it('informa si la salida no es posterior a la llegada', () => {
    http.expectOne('/api-test/alojamientos/9').flush(detalle);
    fixture.detectChanges();

    const llegada = element.querySelector<HTMLInputElement>('#estancia-llegada')!;
    const salida = element.querySelector<HTMLInputElement>('#estancia-salida')!;

    llegada.value = '2030-06-13';
    llegada.dispatchEvent(new Event('input'));

    salida.value = '2030-06-10';
    salida.dispatchEvent(new Event('input'));
    salida.dispatchEvent(new Event('blur'));

    fixture.detectChanges();

    expect(element.querySelector('#estancia-errores')?.textContent).toContain(
      'La salida debe ser posterior a la llegada',
    );
    expect(element.querySelector('.estancia-seleccionada')).toBeNull();
  });

  it('valida la capacidad máxima del alojamiento', () => {
    http.expectOne('/api-test/alojamientos/9').flush(detalle);
    fixture.detectChanges();

    const huespedes = element.querySelector<HTMLInputElement>('#estancia-huespedes')!;

    huespedes.value = '5';
    huespedes.dispatchEvent(new Event('input'));
    huespedes.dispatchEvent(new Event('blur'));

    fixture.detectChanges();

    expect(huespedes.max).toBe('4');
    expect(element.querySelector('#estancia-errores')?.textContent).toContain(
      'Indica entre 1 y 4 huéspedes',
    );
  });
});
