import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import {
  InformacionMinimaIncompletaError,
  PublicacionNoEncontradaError,
  TransicionNoPermitidaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import { EstadoPublicacion, Publicacion } from '@features/publicaciones/domain/models/publicacion';
import { of, Subject, throwError } from 'rxjs';
import { PublicacionAdminRepository } from '../../../domain/repositories/publicacion-admin.repository';
import { DetallePublicacionAdminPageComponent } from './detalle-publicacion-admin-page.component';

/** HU-015: el detalle de una publicación para el Administrador. */
describe('DetallePublicacionAdminPageComponent', () => {
  const MOTIVO = 'Se corrigieron las fotos y los datos';
  const publicacion = (
    estado: EstadoPublicacion = 'BLOQUEADA',
    extra: Partial<Publicacion> = {},
  ): Publicacion => ({
    idPublicacion: 9,
    idAnfitrion: 3,
    estado,
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: 'Chapinero',
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 30000,
    reglas: 'No fumar',
    motivoBloqueo: estado === 'BLOQUEADA' ? 'Las fotos no corresponden' : null,
    ...extra,
  });

  let fixture: ComponentFixture<DetallePublicacionAdminPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<PublicacionAdminRepository>;
  let confirmacion: jasmine.SpyObj<ConfirmacionService>;
  let router: Router;
  let toast: ToastService;

  const crearPagina = (id: string | undefined = '9') => {
    fixture = TestBed.createComponent(DetallePublicacionAdminPageComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
  };
  const texto = (selector: string) => element.querySelector(selector)?.textContent?.trim();
  const boton = (contenedor: ParentNode, nombre: string) =>
    Array.from(contenedor.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(nombre),
    )!;
  const dialogo = () => element.querySelector<HTMLDialogElement>('dialog')!;
  const escribirMotivo = (valor: string) => {
    const campo = element.querySelector<HTMLTextAreaElement>('textarea')!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const botonesDeLaTarjeta = () =>
    Array.from(element.querySelectorAll('.tarjeta footer button')).map((b) =>
      b.textContent!.trim(),
    );

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionAdminRepository>('PublicacionAdminRepository', [
      'obtener',
      'aprobar',
      'rechazar',
      'bloquear',
      'reactivar',
    ]);
    repository.obtener.and.returnValue(of(publicacion()));
    confirmacion = jasmine.createSpyObj<ConfirmacionService>('ConfirmacionService', ['confirmar']);
    confirmacion.confirmar.and.returnValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PublicacionAdminRepository, useValue: repository },
        { provide: ConfirmacionService, useValue: confirmacion },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    if (element && dialogo()?.open) {
      dialogo().close();
    }
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
    });

    it('si falla muestra un mensaje con "Reintentar", y al reintentar muestra el detalle', () => {
      repository.obtener.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      crearPagina();
      expect(texto('[role="alert"]')).toContain('No fue posible cargar la publicación');

      repository.obtener.and.returnValue(of(publicacion()));
      boton(element, 'Reintentar').click();
      fixture.detectChanges();

      expect(texto('h2')).toBe('Apartamento luminoso');
    });

    it('con un 404 avisa "La publicación no existe" y vuelve a la gestión', () => {
      repository.obtener.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));

      crearPagina();

      expect(toast.toasts().some((t) => t.title === 'La publicación no existe')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/admin', 'publicaciones']);
    });

    it('tiene un enlace para volver a la gestión', () => {
      crearPagina();

      expect(element.querySelector('a[href="/admin/publicaciones"]')).not.toBeNull();
    });
  });

  describe('información', () => {
    it('muestra la información completa y el estado', () => {
      crearPagina();

      const contenido = element.textContent!;
      for (const esperado of [
        'Apartamento luminoso',
        'Anfitrión #3',
        'Calle 10 # 5-20',
        'Chapinero',
        'Cerca del parque',
        'No fumar',
        '250.000',
      ]) {
        expect(contenido).withContext(esperado).toContain(esperado);
      }
      expect(texto('app-estado-publicacion')).toBe('Bloqueada');
    });

    it('muestra el motivo del bloqueo destacado', () => {
      crearPagina();

      expect(texto('.tarjeta__bloqueo')).toContain('Las fotos no corresponden');
    });

    it('sin bloqueo no muestra el recuadro', () => {
      repository.obtener.and.returnValue(of(publicacion('PAUSADA')));

      crearPagina();

      expect(element.querySelector('.tarjeta__bloqueo')).toBeNull();
    });

    it('el título no es un enlace a sí mismo', () => {
      crearPagina();

      expect(element.querySelector('.tarjeta__titulo a')).toBeNull();
    });
  });

  describe('acciones según el estado', () => {
    const esperados: [EstadoPublicacion, string[]][] = [
      ['BORRADOR', []],
      ['PENDIENTE_REVISION', ['Aprobar', 'Rechazar', 'Bloquear']],
      ['ACTIVA', ['Bloquear']],
      ['PAUSADA', ['Reactivar', 'Bloquear']],
      ['BLOQUEADA', ['Reactivar']],
    ];
    for (const [estado, botones] of esperados) {
      it(`${estado}: ${botones.length > 0 ? botones.join(', ') : 'sin botones'}`, () => {
        repository.obtener.and.returnValue(of(publicacion(estado)));

        crearPagina();

        expect(botonesDeLaTarjeta()).toEqual(botones);
      });
    }
  });

  describe('enlace "Intervenir (editar)"', () => {
    for (const estado of ['BORRADOR', 'PENDIENTE_REVISION', 'PAUSADA', 'BLOQUEADA'] as const) {
      it(`aparece en ${estado} y lleva a la edición`, () => {
        repository.obtener.and.returnValue(of(publicacion(estado)));

        crearPagina();

        const enlace = Array.from(element.querySelectorAll('a')).find(
          (a) => a.textContent?.trim() === 'Intervenir (editar)',
        );
        expect(enlace?.getAttribute('href')).toBe('/admin/publicaciones/9/editar');
      });
    }

    it('no aparece en una publicación ACTIVA: antes hay que pausarla', () => {
      repository.obtener.and.returnValue(of(publicacion('ACTIVA')));

      crearPagina();

      const enlaces = Array.from(element.querySelectorAll('a')).map((a) => a.textContent?.trim());
      expect(enlaces).not.toContain('Intervenir (editar)');
    });
  });

  describe('decisiones', () => {
    it('reactivar una bloqueada muestra el motivo del bloqueo en el cuadro y vuelve a cargar', () => {
      repository.reactivar.and.returnValue(of(publicacion('ACTIVA')));
      crearPagina();
      boton(element.querySelector('.tarjeta')!, 'Reactivar').click();
      fixture.detectChanges();
      expect(dialogo().querySelector('.modal__ayuda')!.textContent).toContain(
        'Motivo del bloqueo: «Las fotos no corresponden».',
      );

      repository.obtener.calls.reset();
      repository.obtener.and.returnValue(of(publicacion('ACTIVA')));
      escribirMotivo(MOTIVO);
      boton(dialogo(), 'Reactivar publicación').click();
      fixture.detectChanges();

      expect(repository.reactivar).toHaveBeenCalledOnceWith(9, MOTIVO);
      expect(repository.obtener).toHaveBeenCalledOnceWith(9);
      expect(texto('app-estado-publicacion')).toBe('Activa');
      expect(element.querySelector('.tarjeta__bloqueo')).toBeNull();
      expect(toast.toasts().some((t) => t.title === 'Publicación reactivada')).toBeTrue();
    });

    it('bloquear una activa con motivo la deja Bloqueada y muestra el motivo', () => {
      repository.obtener.and.returnValue(of(publicacion('ACTIVA')));
      repository.bloquear.and.returnValue(of(publicacion('BLOQUEADA')));
      crearPagina();
      boton(element.querySelector('.tarjeta')!, 'Bloquear').click();
      fixture.detectChanges();

      repository.obtener.and.returnValue(
        of(publicacion('BLOQUEADA', { motivoBloqueo: 'Datos falsos en la descripción' })),
      );
      escribirMotivo('Datos falsos en la descripción');
      boton(dialogo(), 'Bloquear publicación').click();
      fixture.detectChanges();

      expect(repository.bloquear).toHaveBeenCalledOnceWith(9, 'Datos falsos en la descripción');
      expect(texto('app-estado-publicacion')).toBe('Bloqueada');
      expect(texto('.tarjeta__bloqueo')).toContain('Datos falsos en la descripción');
    });

    it('si falta información mínima al reactivar lo informa y no cambia nada', () => {
      repository.obtener.and.returnValue(of(publicacion('PAUSADA')));
      repository.reactivar.and.returnValue(
        throwError(
          () =>
            new InformacionMinimaIncompletaError(
              { reglas: 'Las reglas son obligatorias para solicitar la activación' },
              'La publicación no tiene la información mínima para activarse',
            ),
        ),
      );
      crearPagina();
      boton(element.querySelector('.tarjeta')!, 'Reactivar').click();
      fixture.detectChanges();
      repository.obtener.calls.reset();

      escribirMotivo(MOTIVO);
      boton(dialogo(), 'Reactivar publicación').click();
      fixture.detectChanges();

      expect(texto('.tarjeta__aviso')).toContain(
        'La publicación no tiene la información mínima para activarse',
      );
      expect(texto('app-estado-publicacion')).toBe('Pausada');
      expect(repository.obtener).not.toHaveBeenCalled();
    });

    it('un 409 muestra el mensaje del backend y refresca el estado', () => {
      repository.obtener.and.returnValue(of(publicacion('PAUSADA')));
      repository.bloquear.and.returnValue(
        throwError(() => new TransicionNoPermitidaError('La publicación ya está bloqueada')),
      );
      crearPagina();
      boton(element.querySelector('.tarjeta')!, 'Bloquear').click();
      fixture.detectChanges();
      repository.obtener.calls.reset();
      repository.obtener.and.returnValue(of(publicacion('BLOQUEADA')));

      escribirMotivo(MOTIVO);
      boton(dialogo(), 'Bloquear publicación').click();
      fixture.detectChanges();

      expect(
        toast
          .toasts()
          .some(
            (t) =>
              t.title === 'No se pudo bloquear' && t.message === 'La publicación ya está bloqueada',
          ),
      ).toBeTrue();
      expect(repository.obtener).toHaveBeenCalledOnceWith(9);
      expect(texto('app-estado-publicacion')).toBe('Bloqueada');
    });

    it('aprobar una pendiente pide confirmación y vuelve a cargar', () => {
      repository.obtener.and.returnValue(of(publicacion('PENDIENTE_REVISION')));
      repository.aprobar.and.returnValue(of(publicacion('ACTIVA')));
      crearPagina();
      repository.obtener.calls.reset();
      repository.obtener.and.returnValue(of(publicacion('ACTIVA')));

      boton(element.querySelector('.tarjeta')!, 'Aprobar').click();
      fixture.detectChanges();

      expect(confirmacion.confirmar).toHaveBeenCalledTimes(1);
      expect(repository.aprobar).toHaveBeenCalledOnceWith(9);
      expect(texto('app-estado-publicacion')).toBe('Activa');
    });
  });
});
