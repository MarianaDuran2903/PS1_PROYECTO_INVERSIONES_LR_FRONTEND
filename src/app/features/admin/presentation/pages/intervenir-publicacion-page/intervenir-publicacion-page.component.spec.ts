import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import {
  PublicacionNoEditableError,
  PublicacionNoEncontradaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import {
  CatalogoItem,
  EstadoPublicacion,
  Publicacion,
} from '@features/publicaciones/domain/models/publicacion';
import { PublicacionRepository } from '@features/publicaciones/domain/repositories/publicacion.repository';
import { of, Subject, throwError } from 'rxjs';
import { IntervencionInvalidaError } from '../../../domain/errors/intervencion.errors';
import { PublicacionAdminRepository } from '../../../domain/repositories/publicacion-admin.repository';
import { IntervenirPublicacionPageComponent } from './intervenir-publicacion-page.component';

describe('IntervenirPublicacionPageComponent', () => {
  const ciudades: CatalogoItem[] = [
    { id: 1, nombre: 'Bogotá' },
    { id: 4, nombre: 'Cali' },
  ];
  const tipos: CatalogoItem[] = [
    { id: 10, nombre: 'Apartamento' },
    { id: 20, nombre: 'Casa' },
  ];
  const publicacion = (estado: EstadoPublicacion = 'BLOQUEADA'): Publicacion => ({
    idPublicacion: 9,
    idAnfitrion: 3,
    estado,
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: 'Chapinero',
    ciudad: ciudades[1],
    tipo: tipos[1],
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 30000,
    reglas: 'No fumar',
  });

  let fixture: ComponentFixture<IntervenirPublicacionPageComponent>;
  let element: HTMLElement;
  let admin: jasmine.SpyObj<PublicacionAdminRepository>;
  let catalogos: jasmine.SpyObj<PublicacionRepository>;
  let router: Router;
  let toast: ToastService;

  const campo = (id: string) => element.querySelector<HTMLInputElement>(`#${id}`)!;
  const escribir = (id: string, valor: string) => {
    const elemento = campo(id);
    elemento.value = valor;
    elemento.dispatchEvent(new Event('input'));
    elemento.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const guardar = () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const botonGuardar = () => element.querySelector<HTMLButtonElement>('button[type="submit"]');
  const texto = (selector: string) => element.querySelector(selector)?.textContent?.trim();
  const crearPagina = (id: string | undefined = '9') => {
    fixture = TestBed.createComponent(IntervenirPublicacionPageComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
  };

  beforeEach(() => {
    admin = jasmine.createSpyObj<PublicacionAdminRepository>('PublicacionAdminRepository', [
      'obtener',
      'intervenir',
    ]);
    admin.obtener.and.returnValue(of(publicacion()));
    catalogos = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'ciudades',
      'tiposAlojamiento',
    ]);
    catalogos.ciudades.and.returnValue(of(ciudades));
    catalogos.tiposAlojamiento.and.returnValue(of(tipos));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PublicacionAdminRepository, useValue: admin },
        { provide: PublicacionRepository, useValue: catalogos },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    toast = TestBed.inject(ToastService);
  });

  describe('carga y precarga', () => {
    it('pide la publicación con el id de la ruta', () => {
      crearPagina('9');

      expect(admin.obtener).toHaveBeenCalledOnceWith(9);
    });

    it('muestra el título, el estado y el Anfitrión propietario', () => {
      crearPagina();

      expect(texto('h1')).toBe('Intervenir publicación');
      expect(texto('app-estado-publicacion')).toBe('Bloqueada');
      expect(texto('.pagina__propietario')).toBe('Anfitrión n.º 3');
    });

    it('llena el formulario con los valores de la publicación', () => {
      crearPagina();

      expect(campo('titulo').value).toBe('Apartamento luminoso');
      expect(campo('tarifaLimpieza').value).toBe('30000');
      expect(campo('reglas').value).toBe('No fumar');
      const ciudad = element.querySelector<HTMLSelectElement>('#idCiudad')!;
      expect(ciudad.options[ciudad.selectedIndex].textContent?.trim()).toBe('Cali');
    });

    it('tiene el campo del motivo, vacío', () => {
      crearPagina();

      expect(campo('motivo').value).toBe('');
    });

    it('muestra un indicador mientras carga', () => {
      admin.obtener.and.returnValue(new Subject<Publicacion>());

      crearPagina();

      expect(texto('[role="status"]')).toContain('Cargando');
      expect(element.querySelector('form')).toBeNull();
    });

    it('si falla muestra "Reintentar" y, al reintentar, el formulario', () => {
      admin.obtener.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      crearPagina();
      expect(texto('[role="alert"]')).toContain('No fue posible cargar la publicación');

      admin.obtener.and.returnValue(of(publicacion()));
      element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
      fixture.detectChanges();

      expect(element.querySelector('form')).not.toBeNull();
    });

    it('404 avisa y vuelve a /admin', () => {
      admin.obtener.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));

      crearPagina();

      expect(toast.toasts().some((t) => t.title === 'La publicación no existe')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('403 (sin rol Administrador) lleva a "Sin permisos"', () => {
      admin.obtener.and.returnValue(throwError(() => new ApiError(403, 'HTTP_403', 'x')));

      crearPagina();

      expect(router.navigate).toHaveBeenCalledWith(['/acceso-denegado']);
    });
  });

  describe('según el estado', () => {
    for (const estado of ['BORRADOR', 'PENDIENTE_REVISION', 'PAUSADA', 'BLOQUEADA'] as const) {
      it(`${estado}: formulario habilitado y sin aviso`, () => {
        admin.obtener.and.returnValue(of(publicacion(estado)));

        crearPagina();

        expect(element.querySelector('fieldset')!.disabled).toBeFalse();
        expect(botonGuardar()).not.toBeNull();
        expect(element.querySelector('.alert--info')).toBeNull();
      });
    }

    it('ACTIVA: solo lectura con el mensaje del backend y sin botón de guardar', () => {
      admin.obtener.and.returnValue(of(publicacion('ACTIVA')));

      crearPagina();

      expect(texto('.alert--info')).toBe(
        'La publicación está activa: páusela antes de intervenirla',
      );
      expect(element.querySelector('fieldset')!.disabled).toBeTrue();
      expect(botonGuardar()).toBeNull();
      expect(campo('titulo').value).toBe('Apartamento luminoso');
    });

    it('PENDIENTE_REVISION: las reglas son obligatorias', () => {
      admin.obtener.and.returnValue(of(publicacion('PENDIENTE_REVISION')));
      crearPagina();
      escribir('motivo', 'Corrección de la publicación');

      escribir('reglas', '');

      expect(texto('#reglas-error')).toBe(
        'Las reglas son obligatorias para una publicación en revisión',
      );
      expect(botonGuardar()!.disabled).toBeTrue();
    });

    it('BLOQUEADA: las reglas siguen siendo opcionales', () => {
      crearPagina();
      escribir('motivo', 'Corrección de la publicación');

      escribir('reglas', '');

      expect(texto('#reglas-error')).toBeUndefined();
      expect(botonGuardar()!.disabled).toBeFalse();
    });
  });

  describe('guardar la intervención', () => {
    beforeEach(() => crearPagina());

    it('con 200 envía { motivo, cambios }, avisa "Intervención registrada" y vuelve a /admin', () => {
      admin.intervenir.and.returnValue(of({ ...publicacion(), titulo: 'Título corregido' }));
      escribir('titulo', 'Título corregido');
      escribir('motivo', 'Corrección del título reportada');

      guardar();

      expect(admin.intervenir).toHaveBeenCalledOnceWith(9, {
        motivo: 'Corrección del título reportada',
        cambios: jasmine.objectContaining({
          titulo: 'Título corregido',
          idCiudad: 4,
          idTipo: 20,
          capacidad: 4,
          precioNoche: 250000,
          tarifaLimpieza: 30000,
          reglas: 'No fumar',
        }),
      });
      expect(toast.toasts().some((t) => t.title === 'Intervención registrada')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('sin motivo no llama al backend', () => {
      guardar();

      expect(admin.intervenir).not.toHaveBeenCalled();
      expect(texto('#motivo-error')).toBe('El motivo de la intervención es obligatorio');
    });

    it('el botón queda deshabilitado mientras se envía', () => {
      admin.intervenir.and.returnValue(new Subject<Publicacion>());
      escribir('motivo', 'Corrección de la publicación');

      guardar();

      expect(botonGuardar()!.disabled).toBeTrue();
      expect(botonGuardar()!.textContent).toContain('Guardando');
      guardar();
      expect(admin.intervenir).toHaveBeenCalledTimes(1);
    });

    it('400: muestra los errores (incluido el motivo) y NO borra lo que escribió', () => {
      admin.intervenir.and.returnValue(
        throwError(
          () =>
            new IntervencionInvalidaError({
              motivo: 'El motivo debe tener entre 10 y 500 caracteres',
              capacidad: 'La capacidad debe ser un número entero mayor que 0',
            }),
        ),
      );
      escribir('titulo', 'Título nuevo');
      escribir('motivo', 'Motivo válido para el cambio');

      guardar();

      expect(texto('#motivo-error')).toBe('El motivo debe tener entre 10 y 500 caracteres');
      expect(texto('#capacidad-error')).toBe('La capacidad debe ser un número entero mayor que 0');
      expect(texto('.alert--danger')).toContain('Revisa los campos marcados');
      expect(campo('titulo').value).toBe('Título nuevo');
      expect(campo('motivo').value).toBe('Motivo válido para el cambio');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('409: pasa a solo lectura y muestra el mensaje, sin perder lo escrito', () => {
      admin.intervenir.and.returnValue(
        throwError(
          () =>
            new PublicacionNoEditableError(
              'La publicación está activa: páusela antes de intervenirla',
            ),
        ),
      );
      escribir('titulo', 'Título nuevo');
      escribir('motivo', 'Corrección de la publicación');

      guardar();

      expect(texto('.alert--info')).toBe(
        'La publicación está activa: páusela antes de intervenirla',
      );
      expect(element.querySelector('fieldset')!.disabled).toBeTrue();
      expect(botonGuardar()).toBeNull();
      expect(campo('titulo').value).toBe('Título nuevo');
    });

    it('error de red o 500: mensaje y conserva el formulario', () => {
      admin.intervenir.and.returnValue(
        throwError(() => new ApiError(500, 'HTTP_500', 'Ocurrió un error inesperado')),
      );
      escribir('motivo', 'Corrección de la publicación');

      guardar();

      expect(texto('.alert--danger')).toBe('Ocurrió un error inesperado');
      expect(botonGuardar()!.disabled).toBeFalse();
    });
  });

  describe('cambios sin guardar y cancelar', () => {
    beforeEach(() => crearPagina());

    it('sin tocar nada no hay cambios sin guardar', () => {
      expect(fixture.componentInstance.hayCambiosSinGuardar()).toBeFalse();
    });

    it('al escribir hay cambios sin guardar', () => {
      escribir('motivo', 'Corrección');

      expect(fixture.componentInstance.hayCambiosSinGuardar()).toBeTrue();
    });

    it('tras guardar con éxito ya no hay nada pendiente', () => {
      admin.intervenir.and.returnValue(of(publicacion()));
      escribir('motivo', 'Corrección de la publicación');

      guardar();

      expect(fixture.componentInstance.hayCambiosSinGuardar()).toBeFalse();
    });

    it('Cancelar vuelve al panel de administración', () => {
      Array.from(element.querySelectorAll('button'))
        .find((b) => b.textContent?.includes('Cancelar'))!
        .click();

      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    });
  });
});
