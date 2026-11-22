import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { SESSION_STORAGE_KEY, SessionService } from '@features/auth/application/session.service';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { ReservaHttpRepository } from '@features/reservas/data/repositories/reserva-http.repository';
import { ReservaRepository } from '@features/reservas/domain/repositories/reserva.repository';
import { MONTO_MINIMO_PAGO_TEXTO } from '@shared/pagos/monto-minimo-pago';
import { BehaviorSubject } from 'rxjs';
import { BusquedaAlojamientosHttpRepository } from '../../../data/repositories/busqueda-alojamientos-http.repository';
import { CotizacionHttpRepository } from '../../../data/repositories/cotizacion-http.repository';
import { BusquedaAlojamientosRepository } from '../../../domain/repositories/busqueda-alojamientos.repository';
import { CotizacionRepository } from '../../../domain/repositories/cotizacion.repository';
import {
  AlojamientoDetallePageComponent,
  ESPERA_RECOTIZACION_MS,
} from './alojamiento-detalle-page.component';

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
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    parametros.next(convertToParamMap({ idPublicacion: '9' }));

    TestBed.configureTestingModule({
      imports: [AlojamientoDetallePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl: '/api-test' } },
        {
          provide: BusquedaAlojamientosRepository,
          useClass: BusquedaAlojamientosHttpRepository,
        },
        { provide: CotizacionRepository, useClass: CotizacionHttpRepository },
        { provide: ReservaRepository, useClass: ReservaHttpRepository },
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
    expect(element.textContent).not.toContain('Demo');
    expect(element.textContent).not.toContain('No se ha consultado la disponibilidad');

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

  it('permite editar la estancia sin llamar al servidor hasta que se pide cotizar', () => {
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

  describe('HU-027: cotizar una estancia', () => {
    const respuestaCotizacion = {
      idPublicacion: 9,
      fechaLlegada: '2030-06-10',
      fechaSalida: '2030-06-13',
      noches: 3,
      precio: {
        precioNoche: 250000,
        precioBase: 750000,
        porcentajeDescuento: 0,
        valorDescuento: 0,
        tarifaLimpieza: 50000,
        serviciosAdicionales: [],
        totalServiciosAdicionales: 0,
        porcentajeTarifaServicio: 10,
        tarifaServicio: 75000,
        total: 875000,
      },
    };

    const iniciarSesion = (roles: RolUsuario[]) => {
      TestBed.inject(SessionService).iniciar({
        accessToken: 'token',
        expiraEn: Date.now() + 3_600_000,
        usuario: {
          idUsuario: 1,
          primerNombre: 'Ana',
          primerApellido: 'Pérez',
          correo: 'ana@correo.com',
          roles,
        },
      });
      fixture.detectChanges();
    };
    const cargarDetalle = () => {
      http.expectOne('/api-test/alojamientos/9').flush(detalle);
      fixture.detectChanges();
    };
    const escribir = (selector: string, valor: string) => {
      const campo = element.querySelector<HTMLInputElement>(selector)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      campo.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
    };
    const llenarEstancia = (llegada = '2030-06-10', salida = '2030-06-13', huespedes = '2') => {
      escribir('#estancia-llegada', llegada);
      escribir('#estancia-salida', salida);
      escribir('#estancia-huespedes', huespedes);
    };
    const botonCotizar = () => element.querySelector<HTMLButtonElement>('.cotizar');
    const pedirCotizacion = () => {
      botonCotizar()!.click();
      fixture.detectChanges();
    };
    const filas = () =>
      Array.from(element.querySelectorAll<HTMLElement>('.desglose .fila')).map((fila) =>
        fila.textContent!.replace(/\s+/g, ' ').trim(),
      );
    const rechazar = (estado: number, cuerpo: Record<string, unknown>) => {
      http
        .expectOne('/api-test/cotizaciones')
        .flush(
          { fecha: '', estado, error: 'Error', ruta: '/api/v1/cotizaciones', ...cuerpo },
          { status: estado, statusText: 'Error' },
        );
      fixture.detectChanges();
    };

    describe('quién puede cotizar', () => {
      it('un Visitante ve el enlace para iniciar sesión y no el botón', () => {
        cargarDetalle();

        expect(botonCotizar()).toBeNull();
        const enlace = element.querySelector<HTMLAnchorElement>('.nota--cotizacion a')!;
        expect(enlace.textContent).toContain('Inicia sesión');
        expect(new URL(enlace.href).pathname).toBe('/login');
        expect(new URL(enlace.href).searchParams.has('returnUrl')).toBeTrue();
      });

      for (const rol of [RolUsuario.Anfitrion, RolUsuario.Administrador]) {
        it(`un ${rol} ve que solo los Huéspedes cotizan y no puede pedirla`, () => {
          cargarDetalle();
          iniciarSesion([rol]);

          expect(botonCotizar()).toBeNull();
          expect(element.textContent).toContain('Solo los Huéspedes pueden cotizar');
          http.expectNone('/api-test/cotizaciones');
        });
      }

      it('un Huésped ve el botón para cotizar', () => {
        cargarDetalle();
        iniciarSesion([RolUsuario.Huesped]);

        expect(botonCotizar()!.textContent).toContain('Cotizar estancia');
        expect(botonCotizar()!.disabled).toBeFalse();
        expect(element.textContent).toContain('no reserva las fechas');
      });

      it('una persona con varios roles que incluye Huésped también cotiza', () => {
        cargarDetalle();
        iniciarSesion([RolUsuario.Anfitrion, RolUsuario.Huesped]);

        expect(botonCotizar()).not.toBeNull();
      });
    });

    describe('cotizar', () => {
      beforeEach(() => {
        cargarDetalle();
        iniciarSesion([RolUsuario.Huesped]);
      });

      it('sin fechas no llama al servidor y muestra los errores del formulario', () => {
        pedirCotizacion();

        http.expectNone('/api-test/cotizaciones');
        expect(element.querySelector('#estancia-errores')!.textContent).toContain(
          'Selecciona llegada y salida',
        );
      });

      it('con fechas inválidas no llama al servidor', () => {
        llenarEstancia('2030-06-13', '2030-06-10');

        pedirCotizacion();

        http.expectNone('/api-test/cotizaciones');
        expect(element.querySelector('#estancia-errores')!.textContent).toContain(
          'La salida debe ser posterior a la llegada',
        );
      });

      it('envía el alojamiento, las fechas y los huéspedes', () => {
        llenarEstancia();

        pedirCotizacion();

        const req = http.expectOne('/api-test/cotizaciones');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
          idPublicacion: 9,
          fechaLlegada: '2030-06-10',
          fechaSalida: '2030-06-13',
          huespedes: 2,
        });
        req.flush(respuestaCotizacion);
      });

      it('no ofrece servicios adicionales ni los envía', () => {
        llenarEstancia();

        pedirCotizacion();

        const req = http.expectOne('/api-test/cotizaciones');
        expect('serviciosAdicionales' in (req.request.body as object)).toBeFalse();
        req.flush(respuestaCotizacion);
      });

      it('mientras espera, deshabilita el botón y avisa que está calculando', () => {
        llenarEstancia();

        pedirCotizacion();

        expect(botonCotizar()!.disabled).toBeTrue();
        expect(botonCotizar()!.getAttribute('aria-busy')).toBe('true');
        expect(element.querySelector('.cotizacion')!.textContent).toContain('Calculando');
        http.expectOne('/api-test/cotizaciones').flush(respuestaCotizacion);
      });

      it('muestra el desglose y el total que devuelve el backend', () => {
        llenarEstancia();

        pedirCotizacion();
        http.expectOne('/api-test/cotizaciones').flush(respuestaCotizacion);
        fixture.detectChanges();

        const texto = filas();
        expect(texto[0]).toContain('3 noches × $250,000');
        expect(texto[0]).toContain('$750,000');
        expect(texto[texto.length - 1]).toContain('$875,000 COP');
        expect(botonCotizar()!.disabled).toBeFalse();
        expect(element.querySelector('.desglose__nota')!.textContent).toContain(
          'no reserva ni bloquea las fechas',
        );
      });

      it('409: dice que no se pudo cotizar, pide otras fechas y no muestra desglose', () => {
        llenarEstancia();

        pedirCotizacion();
        rechazar(409, {
          mensaje: 'No se puede generar una cotización para las fechas seleccionadas',
        });

        const alerta = element.querySelector('.cotizacion [role="alert"]')!;
        expect(alerta.textContent).toContain('No se pudo cotizar');
        expect(alerta.textContent).toContain(
          'No se puede generar una cotización para las fechas seleccionadas',
        );
        expect(alerta.textContent).toContain('otras fechas');
        expect(element.querySelector('.desglose')).toBeNull();
      });

      it('404: ofrece volver al listado', () => {
        llenarEstancia();

        pedirCotizacion();
        rechazar(404, { mensaje: 'El alojamiento no está disponible' });

        const alerta = element.querySelector('.cotizacion [role="alert"]')!;
        expect(alerta.textContent).toContain('El alojamiento no está disponible');
        const enlace = alerta.querySelector<HTMLAnchorElement>('a')!;
        expect(enlace.textContent).toContain('Volver al listado');
        expect(new URL(enlace.href).pathname).toBe('/alojamientos');
      });

      it('400: muestra el mensaje del servidor junto al campo que lo causó', () => {
        llenarEstancia();

        pedirCotizacion();
        rechazar(400, {
          mensaje: 'Los datos enviados no son válidos',
          errores: { huespedes: 'El alojamiento admite como máximo 4 huéspedes' },
        });

        const mensaje = element.querySelector('#estancia-huespedes-error')!;
        expect(mensaje.textContent).toContain('El alojamiento admite como máximo 4 huéspedes');
        const campo = element.querySelector<HTMLInputElement>('#estancia-huespedes')!;
        expect(campo.getAttribute('aria-invalid')).toBe('true');
        expect(campo.getAttribute('aria-describedby')).toContain('estancia-huespedes-error');
        expect(element.querySelector('.cotizacion [role="alert"]')).toBeNull();
      });

      it('400 en la salida: el mensaje del rango queda en el campo de salida', () => {
        llenarEstancia();

        pedirCotizacion();
        rechazar(400, {
          mensaje: 'Los datos enviados no son válidos',
          errores: { rangoFechasValido: 'La salida debe ser posterior a la llegada' },
        });

        expect(element.querySelector('#estancia-salida-error')!.textContent).toContain(
          'La salida debe ser posterior a la llegada',
        );
      });

      it('403: explica el motivo en la propia pantalla', () => {
        llenarEstancia();

        pedirCotizacion();
        rechazar(403, { mensaje: 'Acceso denegado' });

        expect(element.querySelector('.cotizacion [role="alert"]')!.textContent).toContain(
          'Solo los Huéspedes pueden cotizar',
        );
      });

      it('un fallo del servidor muestra un aviso y permite intentarlo de nuevo', () => {
        llenarEstancia();

        pedirCotizacion();
        rechazar(500, {});

        expect(element.querySelector('.cotizacion [role="alert"]')).not.toBeNull();
        expect(botonCotizar()!.disabled).toBeFalse();

        pedirCotizacion();
        http.expectOne('/api-test/cotizaciones').flush(respuestaCotizacion);
        fixture.detectChanges();

        expect(element.querySelector('.desglose')).not.toBeNull();
      });
    });

    describe('reservar lo cotizado y pasar al pago', () => {
      const reservaCreada = {
        idReserva: 2,
        idPublicacion: 9,
        fechaLlegada: '2030-06-10',
        fechaSalida: '2030-06-13',
        noches: 3,
        huespedes: 2,
        estado: 'PENDIENTE_PAGO',
        fechaExpiracion: '2030-06-01T10:30:00Z',
        precio: {
          precioBase: 750000,
          porcentajeDescuento: 0,
          valorDescuento: 0,
          tarifaLimpieza: 50000,
          porcentajeTarifaServicio: 10,
          tarifaServicio: 75000,
          total: 875000,
        },
      };
      const botonReservar = () =>
        element.querySelector<HTMLButtonElement>('app-accion-reservar button');
      const cotizarEstancia = () => {
        llenarEstancia();
        pedirCotizacion();
        http.expectOne('/api-test/cotizaciones').flush(respuestaCotizacion);
        fixture.detectChanges();
      };

      beforeEach(() => {
        cargarDetalle();
        iniciarSesion([RolUsuario.Huesped]);
      });

      it('antes de cotizar no hay nada que reservar', () => {
        expect(element.querySelector('app-accion-reservar')).toBeNull();
      });

      it('con la cotización lista aparece «Reservar y pagar», debajo del desglose', () => {
        cotizarEstancia();

        expect(botonReservar()!.textContent).toContain('Reservar y pagar');
        const orden = element
          .querySelector('.desglose')!
          .compareDocumentPosition(element.querySelector('app-accion-reservar')!);
        expect(orden & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });

      it('si la cotización falla (409) no se ofrece reservar', () => {
        llenarEstancia();
        pedirCotizacion();
        rechazar(409, { mensaje: 'No se puede generar una cotización' });

        expect(element.querySelector('app-accion-reservar')).toBeNull();
      });

      it('al pulsar reserva exactamente lo cotizado, con Idempotency-Key', () => {
        cotizarEstancia();

        botonReservar()!.click();

        const peticion = http.expectOne('/api-test/reservas');
        expect(peticion.request.method).toBe('POST');
        expect(peticion.request.body).toEqual({
          idPublicacion: 9,
          fechaLlegada: '2030-06-10',
          fechaSalida: '2030-06-13',
          huespedes: 2,
        });
        expect(peticion.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
        peticion.flush(reservaCreada, { status: 201, statusText: 'Created' });
      });

      it('al crearse la reserva lleva a la pantalla de pago', () => {
        const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        cotizarEstancia();

        botonReservar()!.click();
        http
          .expectOne('/api-test/reservas')
          .flush(reservaCreada, { status: 201, statusText: 'Created' });

        expect(navegar).toHaveBeenCalledOnceWith(['/reservas', 2, 'pago']);
      });

      it('409: otra persona tomó las fechas, lo avisa y vuelve a cotizar', () => {
        cotizarEstancia();

        botonReservar()!.click();
        http.expectOne('/api-test/reservas').flush(
          {
            fecha: '',
            estado: 409,
            error: 'Conflict',
            mensaje: 'Las fechas seleccionadas no están disponibles',
            ruta: '/api/v1/reservas',
          },
          { status: 409, statusText: 'Conflict' },
        );
        fixture.detectChanges();

        // La cotización que se mostraba quedó desactualizada: se pide de nuevo.
        rechazar(409, { mensaje: 'No se puede generar una cotización' });
        expect(element.querySelector('.cotizacion [role="alert"]')!.textContent).toContain(
          'No se pudo cotizar',
        );
        expect(element.querySelector('app-accion-reservar')).toBeNull();
      });

      it('403: explica en la pantalla que solo los Huéspedes reservan, sin aviso global', () => {
        cotizarEstancia();

        botonReservar()!.click();
        http.expectOne('/api-test/reservas').flush(
          {
            fecha: '',
            estado: 403,
            error: 'Forbidden',
            mensaje: 'No tiene permisos',
            ruta: '/api/v1/reservas',
          },
          { status: 403, statusText: 'Forbidden' },
        );
        fixture.detectChanges();

        expect(element.querySelector('app-accion-reservar [role="alert"]')!.textContent).toContain(
          'Solo los Huéspedes pueden reservar',
        );
      });
    });

    describe('monto mínimo de pago (MAR-611)', () => {
      // 1 noche a $ 1.100 + 10 % de servicio = $ 1.210: la pasarela rechazaría el cobro.
      const cotizacionBajoMinimo = {
        ...respuestaCotizacion,
        fechaSalida: '2030-06-11',
        noches: 1,
        precio: {
          ...respuestaCotizacion.precio,
          precioNoche: 1100,
          precioBase: 1100,
          tarifaLimpieza: 0,
          tarifaServicio: 110,
          total: 1210,
        },
      };
      const cargarBarato = () => {
        http.expectOne('/api-test/alojamientos/9').flush({ ...detalle, precioNoche: 1100 });
        fixture.detectChanges();
      };
      const alertaMinimo = () => element.querySelector('.monto-minimo');

      it('con un precio por noche menor al mínimo avisa antes de cotizar', () => {
        cargarBarato();

        expect(element.querySelector('#aviso-monto-minimo')!.textContent).toContain(
          `El pago mínimo de una reserva es de ${MONTO_MINIMO_PAGO_TEXTO} COP`,
        );
      });

      it('con un precio por noche normal no muestra ese aviso', () => {
        cargarDetalle();

        expect(element.querySelector('#aviso-monto-minimo')).toBeNull();
      });

      it('si el total no alcanza el mínimo, no ofrece reservar y dice cuántas noches elegir', () => {
        cargarBarato();
        iniciarSesion([RolUsuario.Huesped]);
        llenarEstancia('2030-06-10', '2030-06-11');
        pedirCotizacion();
        http.expectOne('/api-test/cotizaciones').flush(cotizacionBajoMinimo);
        fixture.detectChanges();

        expect(element.querySelector('app-accion-reservar')).toBeNull();
        expect(alertaMinimo()!.getAttribute('role')).toBe('alert');
        expect(alertaMinimo()!.textContent).toContain(
          `menor que ${MONTO_MINIMO_PAGO_TEXTO} COP, el mínimo que acepta la pasarela de pagos`,
        );
        // 9 noches × $ 1.100 × 1,1 = $ 10.890; con 8 serían $ 9.680.
        expect(alertaMinimo()!.textContent).toContain('unas 9 noches');
        // Es una estimación: el descuento por estadía larga puede cambiar el total.
        expect(alertaMinimo()!.textContent).toContain('cálculo aproximado');
        expect(alertaMinimo()!.textContent).not.toContain('Elige al menos');
        // El desglose se sigue mostrando: la persona ve por qué no alcanza.
        expect(element.querySelector('.desglose')).not.toBeNull();
      });

      it('si el total alcanza el mínimo, ofrece reservar sin la alerta', () => {
        cargarDetalle();
        iniciarSesion([RolUsuario.Huesped]);
        llenarEstancia();
        pedirCotizacion();
        http.expectOne('/api-test/cotizaciones').flush(respuestaCotizacion);
        fixture.detectChanges();

        expect(alertaMinimo()).toBeNull();
        expect(element.querySelector('app-accion-reservar')).not.toBeNull();
      });
    });

    describe('volver a cotizar al cambiar la estancia', () => {
      // La sesión se abre fuera de fakeAsync: su temporizador de vencimiento no debe simularse,
      // porque al terminar la prueba se ejecutaría y cerraría la sesión.
      beforeEach(() => iniciarSesion([RolUsuario.Huesped]));

      // Al cargar el detalle el formulario se reinicia y arranca la espera de la recotización.
      // Se hace dentro de fakeAsync para que ese temporizador sea simulado y no uno real, que
      // impediría programar el de cada prueba.
      beforeEach(fakeAsync(() => {
        cargarDetalle();
        tick(ESPERA_RECOTIZACION_MS);
      }));

      it('antes de pedir la primera cotización, los cambios no llaman al servidor', fakeAsync(() => {
        llenarEstancia();

        tick(ESPERA_RECOTIZACION_MS);

        http.expectNone('/api-test/cotizaciones');
        expect(element.querySelector('.cotizacion')!.textContent!.trim()).toBe('');
      }));

      it('cambiar las fechas o los huéspedes vuelve a cotizar', fakeAsync(() => {
        llenarEstancia();
        pedirCotizacion();
        http.expectOne('/api-test/cotizaciones').flush(respuestaCotizacion);
        fixture.detectChanges();

        escribir('#estancia-huespedes', '3');
        tick(ESPERA_RECOTIZACION_MS);

        const req = http.expectOne('/api-test/cotizaciones');
        expect((req.request.body as { huespedes: number }).huespedes).toBe(3);
        req.flush({ ...respuestaCotizacion, noches: 3 });
        fixture.detectChanges();

        escribir('#estancia-salida', '2030-06-17');
        tick(ESPERA_RECOTIZACION_MS);

        const segunda = http.expectOne('/api-test/cotizaciones');
        expect((segunda.request.body as { fechaSalida: string }).fechaSalida).toBe('2030-06-17');
        segunda.flush({
          ...respuestaCotizacion,
          fechaSalida: '2030-06-17',
          noches: 7,
          precio: { ...respuestaCotizacion.precio, total: 2000000 },
        });
        fixture.detectChanges();

        expect(filas()[0]).toContain('7 noches');
        expect(filas()[filas().length - 1]).toContain('$2,000,000 COP');
      }));

      it('espera a que termine de escribir: varios cambios seguidos hacen una sola petición', fakeAsync(() => {
        llenarEstancia();
        pedirCotizacion();
        http.expectOne('/api-test/cotizaciones').flush(respuestaCotizacion);
        fixture.detectChanges();

        escribir('#estancia-huespedes', '1');
        tick(ESPERA_RECOTIZACION_MS / 2);
        escribir('#estancia-huespedes', '3');
        tick(ESPERA_RECOTIZACION_MS);

        const req = http.expectOne('/api-test/cotizaciones');
        expect((req.request.body as { huespedes: number }).huespedes).toBe(3);
        req.flush(respuestaCotizacion);
      }));

      it('si los datos dejan de ser válidos, retira el desglose y no consulta', fakeAsync(() => {
        llenarEstancia();
        pedirCotizacion();
        http.expectOne('/api-test/cotizaciones').flush(respuestaCotizacion);
        fixture.detectChanges();
        expect(element.querySelector('.desglose')).not.toBeNull();

        escribir('#estancia-salida', '2030-06-09');
        tick(ESPERA_RECOTIZACION_MS);
        fixture.detectChanges();

        http.expectNone('/api-test/cotizaciones');
        expect(element.querySelector('.desglose')).toBeNull();
      }));

      it('después de un 409, cambiar las fechas vuelve a intentar', fakeAsync(() => {
        llenarEstancia();
        pedirCotizacion();
        rechazar(409, { mensaje: 'No se puede generar una cotización' });

        escribir('#estancia-llegada', '2030-07-01');
        escribir('#estancia-salida', '2030-07-04');
        tick(ESPERA_RECOTIZACION_MS);

        http.expectOne('/api-test/cotizaciones').flush(respuestaCotizacion);
        fixture.detectChanges();

        expect(element.querySelector('.desglose')).not.toBeNull();
        expect(element.querySelector('.cotizacion [role="alert"]')).toBeNull();
      }));

      it('al cambiar de alojamiento, descarta la cotización anterior', fakeAsync(() => {
        llenarEstancia();
        pedirCotizacion();
        http.expectOne('/api-test/cotizaciones').flush(respuestaCotizacion);
        fixture.detectChanges();
        expect(element.querySelector('.desglose')).not.toBeNull();

        parametros.next(convertToParamMap({ idPublicacion: '10' }));
        fixture.detectChanges();
        http.expectOne('/api-test/alojamientos/10').flush({ ...detalle, idPublicacion: 10 });
        fixture.detectChanges();
        tick(ESPERA_RECOTIZACION_MS);

        expect(element.querySelector('.desglose')).toBeNull();
        http.expectNone('/api-test/cotizaciones');
      }));
    });
  });
});
