import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import { InformacionMinimaIncompletaError } from '@features/publicaciones/domain/errors/publicacion.errors';
import { Pagina, Publicacion } from '@features/publicaciones/domain/models/publicacion';
import { of, Subject, throwError } from 'rxjs';
import { MotivoInvalidoError } from '../../../domain/errors/revision.errors';
import { PublicacionAdminRepository } from '../../../domain/repositories/publicacion-admin.repository';
import { BandejaPendientesPageComponent } from './bandeja-pendientes-page.component';

/** HU-013: la bandeja del Administrador, de punta a punta en la página. */
describe('BandejaPendientesPageComponent', () => {
  const publicacion = (id: number, extra: Partial<Publicacion> = {}): Publicacion => ({
    idPublicacion: id,
    idAnfitrion: 30 + id,
    estado: 'PENDIENTE_REVISION',
    titulo: `Publicación ${id}`,
    descripcion: `Descripción de la publicación ${id}`,
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: 'Chapinero',
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 30000,
    reglas: 'No fumar',
    ...extra,
  });
  const pagina = (
    contenido: Publicacion[],
    numero = 0,
    totalPaginas = 1,
    mensaje: string | null = null,
  ): Pagina<Publicacion> => ({
    contenido,
    pagina: numero,
    tamano: 10,
    totalElementos: contenido.length,
    totalPaginas,
    mensaje,
  });

  let fixture: ComponentFixture<BandejaPendientesPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<PublicacionAdminRepository>;
  let confirmacion: jasmine.SpyObj<ConfirmacionService>;
  let toast: ToastService;

  const tarjetas = () => Array.from(element.querySelectorAll<HTMLElement>('.tarjeta'));
  const boton = (contenedor: ParentNode, nombre: string) =>
    Array.from(contenedor.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(nombre),
    )!;
  const dialogo = () => element.querySelector<HTMLDialogElement>('dialog')!;
  const escribirMotivo = (texto: string) => {
    const campo = element.querySelector<HTMLTextAreaElement>('textarea')!;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const crear = () => {
    fixture = TestBed.createComponent(BandejaPendientesPageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionAdminRepository>('PublicacionAdminRepository', [
      'listarPendientes',
      'aprobar',
      'rechazar',
    ]);
    repository.listarPendientes.and.returnValue(of(pagina([publicacion(4), publicacion(8)])));
    confirmacion = jasmine.createSpyObj<ConfirmacionService>('ConfirmacionService', ['confirmar']);
    confirmacion.confirmar.and.returnValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PublicacionAdminRepository, useValue: repository },
        { provide: ConfirmacionService, useValue: confirmacion },
      ],
    });
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    if (element && dialogo()?.open) {
      dialogo().close();
    }
  });

  describe('carga y lista', () => {
    it('pide la primera página con 10 por página', () => {
      crear();

      expect(repository.listarPendientes).toHaveBeenCalledOnceWith(0, 10);
    });

    it('muestra un indicador mientras carga', () => {
      repository.listarPendientes.and.returnValue(new Subject<Pagina<Publicacion>>());

      crear();

      expect(element.querySelector('[role="status"]')!.textContent).toContain('Cargando');
      expect(tarjetas().length).toBe(0);
    });

    it('si falla muestra un mensaje con "Reintentar", y al reintentar muestra la lista', () => {
      repository.listarPendientes.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      crear();
      expect(element.querySelector('[role="alert"]')!.textContent).toContain(
        'No fue posible cargar las publicaciones pendientes',
      );

      repository.listarPendientes.and.returnValue(of(pagina([publicacion(4)])));
      boton(element, 'Reintentar').click();
      fixture.detectChanges();

      expect(tarjetas().length).toBe(1);
    });

    it('muestra una tarjeta por publicación, en el orden que llega la lista', () => {
      crear();

      const titulos = tarjetas().map((t) =>
        t.querySelector('.tarjeta__titulo')!.textContent!.trim(),
      );
      expect(titulos).toEqual(['Publicación 4', 'Publicación 8']);
      expect(element.querySelector('.total')!.textContent).toContain('2 publicaciones pendientes');
    });

    it('cada tarjeta trae toda la información para decidir', () => {
      crear();

      const texto = tarjetas()[0].textContent!;
      for (const esperado of [
        'Publicación 4',
        'Anfitrión #34',
        'Descripción de la publicación 4',
        'Calle 10 # 5-20',
        'Chapinero',
        'Bogotá',
        'Casa',
        'Flexible',
        '4 huéspedes',
        '250.000',
        '30.000',
        'No fumar',
      ]) {
        expect(texto).withContext(esperado).toContain(esperado);
      }
      expect(tarjetas()[0].querySelector('app-estado-publicacion')!.textContent!.trim()).toBe(
        'Pendiente de revisión',
      );
    });

    it('sin barrio ni reglas lo dice en lugar de dejar el campo en blanco', () => {
      repository.listarPendientes.and.returnValue(
        of(pagina([publicacion(4, { barrioZona: null, reglas: null })])),
      );

      crear();

      expect(tarjetas()[0].textContent).toContain('Sin indicar');
      expect(tarjetas()[0].textContent).toContain('El Anfitrión no escribió reglas.');
    });

    it('cada tarjeta tiene los botones Aprobar y Rechazar', () => {
      crear();

      for (const tarjeta of tarjetas()) {
        expect(boton(tarjeta, 'Aprobar')).toBeDefined();
        expect(boton(tarjeta, 'Rechazar')).toBeDefined();
      }
    });

    it('sin pendientes muestra el mensaje de la API y ninguna tarjeta', () => {
      repository.listarPendientes.and.returnValue(
        of(pagina([], 0, 0, 'No hay publicaciones pendientes de revisión')),
      );

      crear();

      expect(element.querySelector('.vacio__mensaje')!.textContent).toContain(
        'No hay publicaciones pendientes de revisión',
      );
      expect(tarjetas().length).toBe(0);
    });
  });

  describe('paginación', () => {
    it('no aparece si hay una sola página', () => {
      crear();

      expect(element.querySelector('.paginacion')).toBeNull();
    });

    it('con varias páginas muestra "Página 1 de 3" y navega con Siguiente y Anterior', () => {
      repository.listarPendientes.and.returnValue(of(pagina([publicacion(4)], 0, 3)));
      crear();
      expect(element.querySelector('.paginacion__texto')!.textContent).toContain('Página 1 de 3');
      expect(boton(element, 'Anterior').disabled).toBeTrue();

      repository.listarPendientes.and.returnValue(of(pagina([publicacion(9)], 1, 3)));
      boton(element, 'Siguiente').click();
      fixture.detectChanges();

      expect(repository.listarPendientes).toHaveBeenCalledWith(1, 10);
      expect(element.querySelector('.paginacion__texto')!.textContent).toContain('Página 2 de 3');
      expect(boton(element, 'Anterior').disabled).toBeFalse();
    });
  });

  describe('aprobar', () => {
    beforeEach(() => crear());

    it('pide confirmación y llama al servidor con el id de la tarjeta', () => {
      repository.aprobar.and.returnValue(new Subject<Publicacion>());

      boton(tarjetas()[1], 'Aprobar').click();

      expect(confirmacion.confirmar).toHaveBeenCalledTimes(1);
      expect(repository.aprobar).toHaveBeenCalledOnceWith(8);
    });

    it('si la persona cancela, no llama al servidor', () => {
      confirmacion.confirmar.and.returnValue(false);

      boton(tarjetas()[0], 'Aprobar').click();

      expect(repository.aprobar).not.toHaveBeenCalled();
    });

    it('mientras aprueba deshabilita los botones y muestra "Aprobando…"', () => {
      repository.aprobar.and.returnValue(new Subject<Publicacion>());

      boton(tarjetas()[0], 'Aprobar').click();
      fixture.detectChanges();

      expect(boton(tarjetas()[0], 'Aprobando').disabled).toBeTrue();
      expect(boton(tarjetas()[1], 'Aprobar').disabled).toBeTrue();
      expect(boton(tarjetas()[1], 'Rechazar').disabled).toBeTrue();
    });

    it('con éxito la saca de la bandeja y avisa', () => {
      repository.aprobar.and.returnValue(of(publicacion(4, { estado: 'ACTIVA' })));
      repository.listarPendientes.and.returnValue(of(pagina([publicacion(8)])));

      boton(tarjetas()[0], 'Aprobar').click();
      fixture.detectChanges();

      expect(tarjetas().length).toBe(1);
      expect(tarjetas()[0].textContent).toContain('Publicación 8');
      expect(toast.toasts().some((t) => t.title === 'Publicación aprobada')).toBeTrue();
    });

    it('si falta información muestra los campos en la tarjeta y la publicación sigue pendiente', () => {
      repository.aprobar.and.returnValue(
        throwError(
          () =>
            new InformacionMinimaIncompletaError(
              { reglas: 'Las reglas son obligatorias para solicitar la activación' },
              'La publicación no tiene la información mínima para activarse',
            ),
        ),
      );
      repository.listarPendientes.calls.reset();

      boton(tarjetas()[0], 'Aprobar').click();
      fixture.detectChanges();

      const aviso = tarjetas()[0].querySelector('.tarjeta__aviso')!;
      expect(aviso.textContent).toContain(
        'La publicación no tiene la información mínima para activarse',
      );
      expect(aviso.querySelector('li')!.textContent).toContain(
        'Las reglas son obligatorias para solicitar la activación',
      );
      expect(aviso.querySelector('a')!.getAttribute('href')).toBe('/admin/publicaciones/4/editar');
      expect(tarjetas().length).toBe(2);
      expect(tarjetas()[1].querySelector('.tarjeta__aviso')).toBeNull();
      expect(repository.listarPendientes).not.toHaveBeenCalled();
    });
  });

  describe('rechazar', () => {
    beforeEach(() => crear());

    it('el cuadro del motivo está cerrado hasta pulsar Rechazar', () => {
      expect(dialogo().open).toBeFalse();

      boton(tarjetas()[0], 'Rechazar').click();
      fixture.detectChanges();

      expect(dialogo().open).toBeTrue();
      expect(dialogo().querySelector('h2')!.textContent).toContain('Rechazar «Publicación 4»');
    });

    it('cancelar cierra el cuadro sin llamar al servidor', () => {
      boton(tarjetas()[0], 'Rechazar').click();
      fixture.detectChanges();

      boton(dialogo(), 'Cancelar').click();
      fixture.detectChanges();

      expect(dialogo().open).toBeFalse();
      expect(repository.rechazar).not.toHaveBeenCalled();
    });

    it('exige un motivo válido: con uno corto el botón de confirmar no deja enviar', () => {
      boton(tarjetas()[0], 'Rechazar').click();
      fixture.detectChanges();

      escribirMotivo('Corto');

      expect(boton(dialogo(), 'Rechazar publicación').disabled).toBeTrue();
      expect(repository.rechazar).not.toHaveBeenCalled();
    });

    it('con un motivo válido llama al servidor con el motivo recortado y la publicación elegida', () => {
      repository.rechazar.and.returnValue(of(publicacion(8, { estado: 'BORRADOR' })));
      repository.listarPendientes.and.returnValue(of(pagina([publicacion(4)])));
      boton(tarjetas()[1], 'Rechazar').click();
      fixture.detectChanges();

      escribirMotivo('  Las fotos no corresponden al alojamiento  ');
      boton(dialogo(), 'Rechazar publicación').click();
      fixture.detectChanges();

      expect(repository.rechazar).toHaveBeenCalledOnceWith(
        8,
        'Las fotos no corresponden al alojamiento',
      );
      expect(dialogo().open).toBeFalse();
      expect(tarjetas().length).toBe(1);
      expect(toast.toasts().some((t) => t.title === 'Publicación rechazada')).toBeTrue();
    });

    it('si el servidor rechaza el motivo, el cuadro sigue abierto con ese mensaje', () => {
      repository.rechazar.and.returnValue(
        throwError(() => new MotivoInvalidoError('El motivo debe tener entre 10 y 500 caracteres')),
      );
      boton(tarjetas()[0], 'Rechazar').click();
      fixture.detectChanges();

      escribirMotivo('Las fotos no corresponden');
      boton(dialogo(), 'Rechazar publicación').click();
      fixture.detectChanges();

      expect(dialogo().open).toBeTrue();
      expect(dialogo().querySelector('[role="alert"]')!.textContent).toContain(
        'El motivo debe tener entre 10 y 500 caracteres',
      );
    });
  });
});
