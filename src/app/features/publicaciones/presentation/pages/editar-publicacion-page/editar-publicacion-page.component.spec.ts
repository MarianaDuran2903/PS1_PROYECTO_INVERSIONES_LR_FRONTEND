import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { of, Subject, throwError } from 'rxjs';
import {
  PublicacionAjenaError,
  PublicacionInvalidaError,
  PublicacionNoEditableError,
  PublicacionNoEncontradaError,
} from '../../../domain/errors/publicacion.errors';
import { CatalogoItem, EstadoPublicacion, Publicacion } from '../../../domain/models/publicacion';
import { PublicacionRepository } from '../../../domain/repositories/publicacion.repository';
import { EditarPublicacionPageComponent } from './editar-publicacion-page.component';

describe('EditarPublicacionPageComponent', () => {
  const ciudades: CatalogoItem[] = [
    { id: 1, nombre: 'Bogotá' },
    { id: 4, nombre: 'Cali' },
  ];
  const tipos: CatalogoItem[] = [
    { id: 10, nombre: 'Apartamento' },
    { id: 20, nombre: 'Casa' },
  ];
  const publicacion = (estado: EstadoPublicacion = 'BORRADOR'): Publicacion => ({
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

  let fixture: ComponentFixture<EditarPublicacionPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<PublicacionRepository>;
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
    fixture = TestBed.createComponent(EditarPublicacionPageComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
  };

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'ciudades',
      'tiposAlojamiento',
      'obtener',
      'actualizar',
    ]);
    repository.ciudades.and.returnValue(of(ciudades));
    repository.tiposAlojamiento.and.returnValue(of(tipos));
    repository.obtener.and.returnValue(of(publicacion()));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PublicacionRepository, useValue: repository }],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    toast = TestBed.inject(ToastService);
  });

  describe('carga', () => {
    it('pide la publicación con el id de la ruta', () => {
      crearPagina('9');

      expect(repository.obtener).toHaveBeenCalledOnceWith(9);
    });

    it('muestra un indicador mientras carga', () => {
      repository.obtener.and.returnValue(new Subject<Publicacion>());

      crearPagina();

      expect(texto('[role="status"]')).toContain('Cargando');
      expect(element.querySelector('form')).toBeNull();
    });

    it('si falla la carga muestra un mensaje con "Reintentar"', () => {
      repository.obtener.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      crearPagina();
      expect(texto('[role="alert"]')).toContain('No fue posible cargar la publicación');
      expect(element.querySelector('form')).toBeNull();

      repository.obtener.and.returnValue(of(publicacion()));
      element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
      fixture.detectChanges();

      expect(element.querySelector('form')).not.toBeNull();
    });

    it('404 avisa y vuelve al panel', () => {
      repository.obtener.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));

      crearPagina();

      expect(toast.toasts().some((t) => t.title === 'La publicación no existe')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/anfitrion']);
    });

    it('403 (publicación de otro Anfitrión) avisa y vuelve al panel', () => {
      repository.obtener.and.returnValue(throwError(() => new PublicacionAjenaError()));

      crearPagina();

      expect(
        toast.toasts().some((t) => t.title === 'No puedes editar esta publicación'),
      ).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/anfitrion']);
    });
  });

  describe('precarga', () => {
    beforeEach(() => crearPagina());

    it('llena el formulario con los valores del GET', () => {
      expect(campo('titulo').value).toBe('Apartamento luminoso');
      expect(campo('descripcion').value).toBe('Cerca del parque');
      expect(campo('direccionTextual').value).toBe('Calle 10 # 5-20');
      expect(campo('barrioZona').value).toBe('Chapinero');
      expect(campo('capacidad').value).toBe('4');
      expect(campo('precioNoche').value).toBe('250000');
      expect(campo('tarifaLimpieza').value).toBe('30000');
      expect(campo('reglas').value).toBe('No fumar');
    });

    it('marca la ciudad y el tipo con sus ids', () => {
      const ciudad = element.querySelector<HTMLSelectElement>('#idCiudad')!;
      expect(ciudad.options[ciudad.selectedIndex].textContent?.trim()).toBe('Cali');
      expect(element.querySelector('.chip:has(input:checked)')?.textContent).toContain('Casa');
    });

    it('muestra el estado con su etiqueta', () => {
      expect(texto('app-estado-publicacion')).toBe('Borrador');
    });
  });

  describe('según el estado', () => {
    for (const estado of ['BORRADOR', 'PAUSADA'] as const) {
      it(`${estado}: formulario habilitado y sin aviso`, () => {
        repository.obtener.and.returnValue(of(publicacion(estado)));

        crearPagina();

        expect(element.querySelector('fieldset')!.disabled).toBeFalse();
        expect(botonGuardar()).not.toBeNull();
        expect(element.querySelector('.alert--info')).toBeNull();
      });
    }

    const avisos = {
      ACTIVA:
        'Esta publicación está activa. Para editarla, solicita al Administrador que la pause.',
      PENDIENTE_REVISION: 'La publicación está en revisión del Administrador.',
      BLOQUEADA: 'La publicación está bloqueada.',
    } as const;

    for (const [estado, aviso] of Object.entries(avisos)) {
      it(`${estado}: solo lectura con su aviso`, () => {
        repository.obtener.and.returnValue(of(publicacion(estado as keyof typeof avisos)));

        crearPagina();

        expect(texto('.alert--info')).toBe(aviso);
        expect(element.querySelector('fieldset')!.disabled).toBeTrue();
        expect(botonGuardar()).toBeNull();
        expect(campo('titulo').value).toBe('Apartamento luminoso');
      });
    }
  });

  describe('guardar', () => {
    beforeEach(() => crearPagina());

    it('con 200 avisa "Cambios guardados" y vuelve al panel', () => {
      repository.actualizar.and.returnValue(of({ ...publicacion(), titulo: 'Nuevo título' }));
      escribir('titulo', 'Nuevo título');

      guardar();

      expect(repository.actualizar).toHaveBeenCalledOnceWith(
        9,
        jasmine.objectContaining({
          titulo: 'Nuevo título',
          idCiudad: 4,
          idTipo: 20,
          capacidad: 4,
          precioNoche: 250000,
          tarifaLimpieza: 30000,
          reglas: 'No fumar',
        }),
      );
      expect(toast.toasts().some((t) => t.title === 'Cambios guardados')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/anfitrion']);
    });

    it('el botón queda deshabilitado mientras se envía', () => {
      repository.actualizar.and.returnValue(new Subject<Publicacion>());

      guardar();

      expect(botonGuardar()!.disabled).toBeTrue();
      expect(botonGuardar()!.textContent).toContain('Guardando');
      guardar();
      expect(repository.actualizar).toHaveBeenCalledTimes(1);
    });

    it('400 con errores: los muestra en cada campo y NO borra lo que escribió la persona', () => {
      repository.actualizar.and.returnValue(
        throwError(
          () =>
            new PublicacionInvalidaError({
              capacidad: 'La capacidad debe ser un número entero mayor que 0',
              tarifaLimpieza: 'La tarifa de limpieza no puede ser negativa',
            }),
        ),
      );
      escribir('titulo', 'Título nuevo');
      escribir('reglas', 'Reglas nuevas');

      guardar();

      expect(texto('#capacidad-error')).toBe('La capacidad debe ser un número entero mayor que 0');
      expect(texto('#tarifaLimpieza-error')).toBe('La tarifa de limpieza no puede ser negativa');
      expect(texto('.alert--danger')).toContain('Revisa los campos marcados');
      expect(campo('titulo').value).toBe('Título nuevo');
      expect(campo('reglas').value).toBe('Reglas nuevas');
      expect(campo('capacidad').value).toBe('4');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('400 sin errores: muestra el mensaje arriba del formulario', () => {
      repository.actualizar.and.returnValue(
        throwError(() => new ApiError(400, 'HTTP_400', 'El cuerpo de la petición no es válido')),
      );

      guardar();

      expect(texto('.alert--danger')).toBe('El cuerpo de la petición no es válido');
      expect(campo('titulo').value).toBe('Apartamento luminoso');
    });

    it('409: pasa a solo lectura y muestra el mensaje', () => {
      repository.actualizar.and.returnValue(
        throwError(
          () =>
            new PublicacionNoEditableError(
              'La publicación está activa: solicite pausarla para editarla',
            ),
        ),
      );
      escribir('titulo', 'Título nuevo');

      guardar();

      expect(texto('.alert--info')).toBe(
        'La publicación está activa: solicite pausarla para editarla',
      );
      expect(element.querySelector('fieldset')!.disabled).toBeTrue();
      expect(botonGuardar()).toBeNull();
      expect(campo('titulo').value).toBe('Título nuevo');
    });

    it('403: avisa y vuelve al panel', () => {
      repository.actualizar.and.returnValue(throwError(() => new PublicacionAjenaError()));

      guardar();

      expect(
        toast.toasts().some((t) => t.title === 'No puedes editar esta publicación'),
      ).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/anfitrion']);
    });

    it('404: avisa y vuelve al panel', () => {
      repository.actualizar.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));

      guardar();

      expect(toast.toasts().some((t) => t.title === 'La publicación no existe')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/anfitrion']);
    });

    it('error de red o 500: mensaje y conserva el formulario', () => {
      repository.actualizar.and.returnValue(
        throwError(() => new ApiError(500, 'HTTP_500', 'Ocurrió un error inesperado')),
      );
      escribir('titulo', 'Título nuevo');

      guardar();

      expect(texto('.alert--danger')).toBe('Ocurrió un error inesperado');
      expect(campo('titulo').value).toBe('Título nuevo');
      expect(botonGuardar()!.disabled).toBeFalse();
    });

    it('con datos inválidos en el cliente no llama al backend', () => {
      escribir('capacidad', '0');

      guardar();

      expect(repository.actualizar).not.toHaveBeenCalled();
      expect(texto('#capacidad-error')).toBe('La capacidad debe ser un número entero mayor que 0');
    });
  });

  describe('cambios sin guardar y cancelar', () => {
    beforeEach(() => crearPagina());

    it('sin tocar nada no hay cambios sin guardar', () => {
      expect(fixture.componentInstance.hayCambiosSinGuardar()).toBeFalse();
    });

    it('al escribir hay cambios sin guardar', () => {
      escribir('titulo', 'Otro título');

      expect(fixture.componentInstance.hayCambiosSinGuardar()).toBeTrue();
    });

    it('tras guardar con éxito ya no hay nada pendiente', () => {
      repository.actualizar.and.returnValue(of(publicacion()));
      escribir('titulo', 'Otro título');

      guardar();

      expect(fixture.componentInstance.hayCambiosSinGuardar()).toBeFalse();
    });

    it('Cancelar vuelve al panel', () => {
      Array.from(element.querySelectorAll('button'))
        .find((b) => b.textContent?.includes('Cancelar'))!
        .click();

      expect(router.navigate).toHaveBeenCalledWith(['/anfitrion']);
    });
  });
});
