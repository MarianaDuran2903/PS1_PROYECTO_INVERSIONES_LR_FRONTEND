import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { of, Subject, throwError } from 'rxjs';
import { PublicacionInvalidaError } from '../../../domain/errors/publicacion.errors';
import { CatalogoItem, Publicacion } from '../../../domain/models/publicacion';
import { PublicacionRepository } from '../../../domain/repositories/publicacion.repository';
import { CrearPublicacionPageComponent } from './crear-publicacion-page.component';

describe('CrearPublicacionPageComponent', () => {
  const ciudades: CatalogoItem[] = [{ id: 1, nombre: 'Bogotá' }];
  const tipos: CatalogoItem[] = [{ id: 2, nombre: 'Apartamento' }];
  const publicacion: Publicacion = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'BORRADOR',
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: null,
    ciudad: ciudades[0],
    tipo: tipos[0],
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 0,
    reglas: null,
    motivoBloqueo: null,
  };

  let fixture: ComponentFixture<CrearPublicacionPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<PublicacionRepository>;
  let toast: ToastService;

  const escribir = (id: string, valor: string) => {
    const campo = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
  };
  const completarFormulario = () => {
    escribir('titulo', 'Apartamento luminoso');
    escribir('descripcion', 'Cerca del parque');
    escribir('direccionTextual', 'Calle 10 # 5-20');
    const ciudad = element.querySelector<HTMLSelectElement>('#idCiudad')!;
    ciudad.selectedIndex = 1;
    ciudad.dispatchEvent(new Event('change'));
    element.querySelector<HTMLInputElement>('.chip input')!.click();
    escribir('capacidad', '4');
    escribir('precioNoche', '250000');
    fixture.detectChanges();
  };
  const guardar = () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const crearPagina = () => {
    fixture = TestBed.createComponent(CrearPublicacionPageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'ciudades',
      'tiposAlojamiento',
      'crear',
    ]);
    repository.ciudades.and.returnValue(of(ciudades));
    repository.tiposAlojamiento.and.returnValue(of(tipos));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PublicacionRepository, useValue: repository }],
    });
    toast = TestBed.inject(ToastService);
  });

  describe('carga de catálogos', () => {
    it('pide ciudades y tipos al abrir y muestra el formulario', () => {
      crearPagina();

      expect(repository.ciudades).toHaveBeenCalledTimes(1);
      expect(repository.tiposAlojamiento).toHaveBeenCalledTimes(1);
      expect(element.querySelector('form')).not.toBeNull();
      expect(element.querySelector('#idCiudad option:nth-child(2)')!.textContent).toContain(
        'Bogotá',
      );
    });

    it('muestra un indicador mientras cargan y no el formulario', () => {
      repository.ciudades.and.returnValue(new Subject<CatalogoItem[]>());

      crearPagina();

      expect(element.querySelector('[role="status"]')!.textContent).toContain('Cargando');
      expect(element.querySelector('form')).toBeNull();
    });

    it('si fallan muestra un mensaje con "Reintentar", y al reintentar muestra el formulario', () => {
      repository.tiposAlojamiento.and.returnValue(
        throwError(() => new ApiError(500, 'HTTP_500', 'Error')),
      );
      crearPagina();

      expect(element.querySelector('[role="alert"]')!.textContent).toContain(
        'No fue posible cargar',
      );
      expect(element.querySelector('form')).toBeNull();

      repository.tiposAlojamiento.and.returnValue(of(tipos));
      element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
      fixture.detectChanges();

      expect(element.querySelector('form')).not.toBeNull();
      expect(repository.ciudades).toHaveBeenCalledTimes(2);
    });
  });

  describe('guardado', () => {
    beforeEach(() => {
      crearPagina();
      completarFormulario();
    });

    it('envía el request correcto', () => {
      repository.crear.and.returnValue(of(publicacion));

      guardar();

      expect(repository.crear).toHaveBeenCalledOnceWith({
        titulo: 'Apartamento luminoso',
        descripcion: 'Cerca del parque',
        direccionTextual: 'Calle 10 # 5-20',
        idCiudad: 1,
        barrioZona: '',
        idTipo: 2,
        capacidad: 4,
        precioNoche: 250000,
      });
    });

    it('con 201 avisa y muestra la ficha con el estado BORRADOR', () => {
      repository.crear.and.returnValue(of(publicacion));

      guardar();

      expect(
        toast.toasts().some((t) => t.title === 'Publicación guardada como borrador'),
      ).toBeTrue();
      expect(element.querySelector('form')).toBeNull();
      expect(element.querySelector('app-publicacion-confirmacion')).not.toBeNull();
      expect(element.querySelector('app-estado-publicacion')!.textContent!.trim()).toBe('Borrador');
      expect(element.textContent).toContain('Todavía no es visible en el Marketplace');
      expect(element.querySelector('h1')!.textContent).toContain('Apartamento luminoso');
    });

    it('con 400 muestra cada error debajo de su campo', () => {
      repository.crear.and.returnValue(
        throwError(
          () =>
            new PublicacionInvalidaError({
              idCiudad: 'La ciudad no existe',
              precioNoche: 'El precio por noche debe ser mayor que 0',
            }),
        ),
      );

      guardar();

      expect(element.querySelector('#idCiudad-error')!.textContent).toContain(
        'La ciudad no existe',
      );
      expect(element.querySelector('#precioNoche-error')!.textContent).toContain(
        'El precio por noche debe ser mayor que 0',
      );
      expect(element.querySelector('app-publicacion-confirmacion')).toBeNull();
    });

    it('con 403 muestra el aviso de permisos y conserva lo escrito', () => {
      repository.crear.and.returnValue(
        throwError(() => new ApiError(403, 'HTTP_403', 'No tiene permisos para esta operación')),
      );

      guardar();

      expect(element.querySelector('.pagina__alerta')!.textContent).toContain(
        'No tiene permisos para esta operación',
      );
      expect(element.querySelector<HTMLInputElement>('#titulo')!.value).toBe(
        'Apartamento luminoso',
      );
    });

    it('"Crear otra publicación" vuelve al formulario vacío', () => {
      repository.crear.and.returnValue(of(publicacion));
      guardar();

      element.querySelector<HTMLButtonElement>('.ficha__resumen button')!.click();
      fixture.detectChanges();

      expect(element.querySelector('form')).not.toBeNull();
      expect(element.querySelector<HTMLInputElement>('#titulo')!.value).toBe('');
    });
  });
});
