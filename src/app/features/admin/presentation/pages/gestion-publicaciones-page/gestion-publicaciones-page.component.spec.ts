import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import {
  InformacionMinimaIncompletaError,
  TransicionNoPermitidaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import {
  EstadoPublicacion,
  Pagina,
  Publicacion,
} from '@features/publicaciones/domain/models/publicacion';
import { of, Subject, throwError } from 'rxjs';
import { MotivoInvalidoError } from '../../../domain/errors/revision.errors';
import { PublicacionAdminRepository } from '../../../domain/repositories/publicacion-admin.repository';
import { GestionPublicacionesPageComponent } from './gestion-publicaciones-page.component';

/** HU-015: la gestión de publicaciones del Administrador, de punta a punta en la página. */
describe('GestionPublicacionesPageComponent', () => {
  const MOTIVO = 'Las fotos no corresponden al alojamiento';
  const publicacion = (
    id: number,
    estado: EstadoPublicacion = 'PENDIENTE_REVISION',
    extra: Partial<Publicacion> = {},
  ): Publicacion => ({
    idPublicacion: id,
    idAnfitrion: 30 + id,
    estado,
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
    motivoBloqueo: null,
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

  let fixture: ComponentFixture<GestionPublicacionesPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<PublicacionAdminRepository>;
  let confirmacion: jasmine.SpyObj<ConfirmacionService>;
  let toast: ToastService;

  const pestanas = () => Array.from(element.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const pestana = (nombre: string) => pestanas().find((p) => p.textContent?.trim() === nombre)!;
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
  const elegir = (nombre: string) => {
    pestana(nombre).click();
    fixture.detectChanges();
  };
  const crear = () => {
    fixture = TestBed.createComponent(GestionPublicacionesPageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionAdminRepository>('PublicacionAdminRepository', [
      'listarPendientes',
      'listar',
      'aprobar',
      'rechazar',
      'bloquear',
      'reactivar',
    ]);
    repository.listarPendientes.and.returnValue(of(pagina([publicacion(4), publicacion(8)])));
    repository.listar.and.returnValue(of(pagina([publicacion(5, 'ACTIVA')])));
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

  describe('pestañas', () => {
    beforeEach(() => crear());

    it('muestra Pendientes, Activas, Pausadas, Bloqueadas y Todas, con Pendientes seleccionada', () => {
      expect(pestanas().map((p) => p.textContent!.trim())).toEqual([
        'Pendientes',
        'Activas',
        'Pausadas',
        'Bloqueadas',
        'Todas',
      ]);
      expect(pestana('Pendientes').getAttribute('aria-selected')).toBe('true');
      expect(pestana('Activas').getAttribute('aria-selected')).toBe('false');
      expect(element.querySelector('[role="tablist"]')).not.toBeNull();
    });

    it('al abrir pide las pendientes con 10 por página', () => {
      expect(repository.listarPendientes).toHaveBeenCalledOnceWith(0, 10);
      expect(repository.listar).not.toHaveBeenCalled();
    });

    const casos: [string, string | null][] = [
      ['Activas', 'ACTIVA'],
      ['Pausadas', 'PAUSADA'],
      ['Bloqueadas', 'BLOQUEADA'],
      ['Todas', null],
    ];
    for (const [nombre, estado] of casos) {
      it(`${nombre} pide la lista con ${estado === null ? 'estado null (sin filtro)' : `estado ${estado}`}`, () => {
        elegir(nombre);

        expect(repository.listar).toHaveBeenCalledOnceWith(estado as never, 0, 10);
        expect(pestana(nombre).getAttribute('aria-selected')).toBe('true');
        expect(pestana('Pendientes').getAttribute('aria-selected')).toBe('false');
      });
    }

    it('el panel se asocia a la pestaña activa', () => {
      elegir('Pausadas');

      const panel = element.querySelector('[role="tabpanel"]')!;
      expect(panel.getAttribute('aria-labelledby')).toBe('pestana-pausadas');
      expect(pestana('Pausadas').getAttribute('aria-controls')).toBe('panel-gestion');
    });

    it('solo la pestaña activa entra en el orden de tabulación', () => {
      elegir('Activas');

      expect(pestanas().map((p) => p.getAttribute('tabindex'))).toEqual([
        '-1',
        '0',
        '-1',
        '-1',
        '-1',
      ]);
    });

    it('pulsar la pestaña ya activa no vuelve a pedir nada', () => {
      repository.listarPendientes.calls.reset();

      elegir('Pendientes');

      expect(repository.listarPendientes).not.toHaveBeenCalled();
    });

    it('las flechas, Inicio y Fin cambian de pestaña', () => {
      const tecla = (clave: string, desde: string) => {
        pestana(desde).dispatchEvent(
          new KeyboardEvent('keydown', { key: clave, cancelable: true }),
        );
        fixture.detectChanges();
      };

      tecla('ArrowRight', 'Pendientes');
      expect(pestana('Activas').getAttribute('aria-selected')).toBe('true');

      tecla('End', 'Activas');
      expect(pestana('Todas').getAttribute('aria-selected')).toBe('true');

      tecla('ArrowRight', 'Todas');
      expect(pestana('Pendientes').getAttribute('aria-selected')).toBe('true');

      tecla('ArrowLeft', 'Pendientes');
      expect(pestana('Todas').getAttribute('aria-selected')).toBe('true');

      tecla('Home', 'Todas');
      expect(pestana('Pendientes').getAttribute('aria-selected')).toBe('true');
    });

    it('otras teclas no cambian de pestaña', () => {
      const evento = new KeyboardEvent('keydown', { key: 'a', cancelable: true });

      pestana('Pendientes').dispatchEvent(evento);

      expect(evento.defaultPrevented).toBeFalse();
      expect(pestana('Pendientes').getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('lista', () => {
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
        'No fue posible cargar las publicaciones',
      );

      repository.listarPendientes.and.returnValue(of(pagina([publicacion(4)])));
      boton(element, 'Reintentar').click();
      fixture.detectChanges();

      expect(tarjetas().length).toBe(1);
    });

    it('muestra una tarjeta por publicación, en el orden que llega', () => {
      crear();

      expect(
        tarjetas().map((t) => t.querySelector('.tarjeta__titulo')!.textContent!.trim()),
      ).toEqual(['Publicación 4', 'Publicación 8']);
      expect(element.querySelector('.total')!.textContent).toContain('2 publicaciones');
    });

    it('cada fila muestra título, «Anfitrión #id», ciudad, tipo, precio y estado', () => {
      crear();

      const texto = tarjetas()[0].textContent!;
      for (const esperado of ['Publicación 4', 'Anfitrión #34', 'Bogotá', 'Casa', '250.000']) {
        expect(texto).withContext(esperado).toContain(esperado);
      }
      expect(tarjetas()[0].querySelector('app-estado-publicacion')!.textContent!.trim()).toBe(
        'Pendiente de revisión',
      );
    });

    it('Pendientes usa la tarjeta completa y las demás pestañas la compacta', () => {
      crear();
      expect(tarjetas()[0].textContent).toContain('Calle 10 # 5-20');
      expect(tarjetas()[0].textContent).toContain('Descripción de la publicación 4');

      elegir('Activas');

      expect(tarjetas()[0].textContent).not.toContain('Calle 10 # 5-20');
      expect(tarjetas()[0].textContent).toContain('Publicación 5');
    });

    it('una fila bloqueada muestra su motivo de bloqueo destacado', () => {
      repository.listar.and.returnValue(
        of(
          pagina([
            publicacion(6, 'BLOQUEADA', { motivoBloqueo: 'Las fotos no corresponden' }),
            publicacion(7, 'BLOQUEADA', { motivoBloqueo: 'Datos falsos' }),
          ]),
        ),
      );
      crear();

      elegir('Bloqueadas');

      const motivos = tarjetas().map((t) => t.querySelector('.tarjeta__bloqueo')?.textContent);
      expect(motivos[0]).toContain('Las fotos no corresponden');
      expect(motivos[1]).toContain('Datos falsos');
    });

    it('los botones de cada fila salen del estado de la publicación', () => {
      repository.listar.and.returnValue(
        of(
          pagina([
            publicacion(1, 'ACTIVA'),
            publicacion(2, 'PAUSADA'),
            publicacion(3, 'BLOQUEADA'),
            publicacion(4, 'BORRADOR'),
          ]),
        ),
      );
      crear();

      elegir('Todas');

      const botones = tarjetas().map((t) =>
        Array.from(t.querySelectorAll('footer button')).map((b) => b.textContent!.trim()),
      );
      expect(botones).toEqual([['Bloquear'], ['Reactivar', 'Bloquear'], ['Reactivar'], []]);
    });

    it('sin publicaciones muestra el mensaje de la API y ninguna tarjeta', () => {
      repository.listar.and.returnValue(of(pagina([], 0, 0, 'No hay publicaciones para mostrar')));
      crear();

      elegir('Pausadas');

      expect(element.querySelector('.vacio__mensaje')!.textContent).toContain(
        'No hay publicaciones para mostrar',
      );
      expect(tarjetas().length).toBe(0);
    });

    it('con varias páginas muestra "Página 1 de 3" y navega dentro de la pestaña', () => {
      repository.listar.and.returnValue(of(pagina([publicacion(5, 'ACTIVA')], 0, 3)));
      crear();
      elegir('Activas');
      expect(element.querySelector('.paginacion__texto')!.textContent).toContain('Página 1 de 3');
      expect(boton(element, 'Anterior').disabled).toBeTrue();

      repository.listar.and.returnValue(of(pagina([publicacion(15, 'ACTIVA')], 1, 3)));
      boton(element, 'Siguiente').click();
      fixture.detectChanges();

      expect(repository.listar).toHaveBeenCalledWith('ACTIVA', 1, 10);
      expect(element.querySelector('.paginacion__texto')!.textContent).toContain('Página 2 de 3');
    });

    it('no muestra la paginación si hay una sola página', () => {
      crear();

      expect(element.querySelector('.paginacion')).toBeNull();
    });
  });

  describe('aprobar y rechazar en Pendientes siguen funcionando', () => {
    beforeEach(() => crear());

    it('aprobar pide confirmación, llama al servidor y la saca de la lista', () => {
      repository.aprobar.and.returnValue(of(publicacion(4, 'ACTIVA')));
      repository.listarPendientes.and.returnValue(of(pagina([publicacion(8)])));

      boton(tarjetas()[0], 'Aprobar').click();
      fixture.detectChanges();

      expect(confirmacion.confirmar).toHaveBeenCalledTimes(1);
      expect(repository.aprobar).toHaveBeenCalledOnceWith(4);
      expect(tarjetas().length).toBe(1);
      expect(toast.toasts().some((t) => t.title === 'Publicación aprobada')).toBeTrue();
    });

    it('rechazar abre el cuadro y llama al servidor con el motivo recortado', () => {
      repository.rechazar.and.returnValue(of(publicacion(8, 'BORRADOR')));
      repository.listarPendientes.and.returnValue(of(pagina([publicacion(4)])));
      boton(tarjetas()[1], 'Rechazar').click();
      fixture.detectChanges();
      expect(dialogo().open).toBeTrue();
      expect(dialogo().querySelector('h2')!.textContent).toContain('Rechazar «Publicación 8»');

      escribirMotivo(`  ${MOTIVO}  `);
      boton(dialogo(), 'Rechazar publicación').click();
      fixture.detectChanges();

      expect(repository.rechazar).toHaveBeenCalledOnceWith(8, MOTIVO);
      expect(dialogo().open).toBeFalse();
      expect(toast.toasts().some((t) => t.title === 'Publicación rechazada')).toBeTrue();
    });
  });

  describe('bloquear', () => {
    beforeEach(() => {
      repository.listar.and.returnValue(of(pagina([publicacion(5, 'ACTIVA')])));
      crear();
      elegir('Activas');
    });

    it('abre el cuadro del motivo con su título, etiqueta y botón', () => {
      boton(tarjetas()[0], 'Bloquear').click();
      fixture.detectChanges();

      expect(dialogo().open).toBeTrue();
      expect(dialogo().querySelector('h2')!.textContent).toContain('Bloquear «Publicación 5»');
      expect(dialogo().querySelector('label')!.textContent).toContain('Motivo del bloqueo');
      expect(boton(dialogo(), 'Bloquear publicación')).toBeDefined();
    });

    it('exige un motivo de 10 a 500 caracteres: con uno corto no deja enviar', () => {
      boton(tarjetas()[0], 'Bloquear').click();
      fixture.detectChanges();

      escribirMotivo('Corto');

      expect(boton(dialogo(), 'Bloquear publicación').disabled).toBeTrue();
      expect(repository.bloquear).not.toHaveBeenCalled();
    });

    it('con un motivo válido llama al servidor con el motivo recortado, avisa y recarga la pestaña', () => {
      repository.bloquear.and.returnValue(of(publicacion(5, 'BLOQUEADA')));
      repository.listar.calls.reset();
      repository.listar.and.returnValue(of(pagina([])));
      boton(tarjetas()[0], 'Bloquear').click();
      fixture.detectChanges();

      escribirMotivo(`  ${MOTIVO}  `);
      boton(dialogo(), 'Bloquear publicación').click();
      fixture.detectChanges();

      expect(repository.bloquear).toHaveBeenCalledOnceWith(5, MOTIVO);
      expect(dialogo().open).toBeFalse();
      expect(toast.toasts().some((t) => t.title === 'Publicación bloqueada')).toBeTrue();
      expect(repository.listar).toHaveBeenCalledOnceWith('ACTIVA', 0, 10);
      expect(tarjetas().length).toBe(0);
    });

    it('cancelar cierra el cuadro sin llamar al servidor', () => {
      boton(tarjetas()[0], 'Bloquear').click();
      fixture.detectChanges();

      boton(dialogo(), 'Cancelar').click();
      fixture.detectChanges();

      expect(dialogo().open).toBeFalse();
      expect(repository.bloquear).not.toHaveBeenCalled();
    });

    it('si el servidor rechaza el motivo, el cuadro sigue abierto con ese mensaje', () => {
      repository.bloquear.and.returnValue(
        throwError(() => new MotivoInvalidoError('El motivo debe tener entre 10 y 500 caracteres')),
      );
      boton(tarjetas()[0], 'Bloquear').click();
      fixture.detectChanges();

      escribirMotivo(MOTIVO);
      boton(dialogo(), 'Bloquear publicación').click();
      fixture.detectChanges();

      expect(dialogo().open).toBeTrue();
      expect(dialogo().querySelector('[role="alert"]')!.textContent).toContain(
        'El motivo debe tener entre 10 y 500 caracteres',
      );
    });

    it('un 409 cierra el cuadro, muestra el mensaje del backend y recarga la pestaña', () => {
      repository.bloquear.and.returnValue(
        throwError(() => new TransicionNoPermitidaError('La publicación ya está bloqueada')),
      );
      repository.listar.calls.reset();
      repository.listar.and.returnValue(of(pagina([publicacion(5, 'BLOQUEADA')])));
      boton(tarjetas()[0], 'Bloquear').click();
      fixture.detectChanges();

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
      expect(dialogo().open).toBeFalse();
      expect(repository.listar).toHaveBeenCalledOnceWith('ACTIVA', 0, 10);
    });
  });

  describe('reactivar', () => {
    beforeEach(() => crear());

    const abrirReactivar = (
      nombrePestana: string,
      estado: EstadoPublicacion,
      extra: Partial<Publicacion> = {},
    ) => {
      repository.listar.and.returnValue(of(pagina([publicacion(6, estado, extra)])));
      elegir(nombrePestana);
      boton(tarjetas()[0], 'Reactivar').click();
      fixture.detectChanges();
    };

    it('al reactivar una bloqueada el cuadro muestra el motivo del bloqueo', () => {
      abrirReactivar('Bloqueadas', 'BLOQUEADA', { motivoBloqueo: 'Las fotos no corresponden' });

      expect(dialogo().open).toBeTrue();
      expect(dialogo().querySelector('h2')!.textContent).toContain('Reactivar «Publicación 6»');
      expect(dialogo().querySelector('.modal__ayuda')!.textContent).toContain(
        'Motivo del bloqueo: «Las fotos no corresponden».',
      );
      expect(dialogo().querySelector('label')!.textContent).toContain('Motivo de la reactivación');
    });

    it('al reactivar una pausada el cuadro no menciona ningún bloqueo', () => {
      abrirReactivar('Pausadas', 'PAUSADA');

      expect(dialogo().querySelector('.modal__ayuda')!.textContent).not.toContain(
        'Motivo del bloqueo',
      );
    });

    it('reactivar exige un motivo: con uno corto no deja enviar', () => {
      abrirReactivar('Pausadas', 'PAUSADA');

      escribirMotivo('Corto');

      expect(boton(dialogo(), 'Reactivar publicación').disabled).toBeTrue();
      expect(repository.reactivar).not.toHaveBeenCalled();
    });

    it('con un motivo válido llama al servidor, avisa y recarga: la publicación vuelve a Activa', () => {
      repository.reactivar.and.returnValue(of(publicacion(6, 'ACTIVA')));
      abrirReactivar('Bloqueadas', 'BLOQUEADA', { motivoBloqueo: 'Datos falsos' });
      repository.listar.and.returnValue(of(pagina([])));

      escribirMotivo(MOTIVO);
      boton(dialogo(), 'Reactivar publicación').click();
      fixture.detectChanges();

      expect(repository.reactivar).toHaveBeenCalledOnceWith(6, MOTIVO);
      expect(dialogo().open).toBeFalse();
      expect(toast.toasts().some((t) => t.title === 'Publicación reactivada')).toBeTrue();
      expect(tarjetas().length).toBe(0);
    });

    it('si falta información mínima lo informa en la fila, no la saca y no cambia nada', () => {
      repository.reactivar.and.returnValue(
        throwError(
          () =>
            new InformacionMinimaIncompletaError(
              { reglas: 'Las reglas son obligatorias para solicitar la activación' },
              'La publicación no tiene la información mínima para activarse',
            ),
        ),
      );
      abrirReactivar('Pausadas', 'PAUSADA');
      repository.listar.calls.reset();

      escribirMotivo(MOTIVO);
      boton(dialogo(), 'Reactivar publicación').click();
      fixture.detectChanges();

      const aviso = tarjetas()[0].querySelector('.tarjeta__aviso')!;
      expect(aviso.textContent).toContain(
        'La publicación no tiene la información mínima para activarse',
      );
      expect(aviso.querySelector('li')!.textContent).toContain(
        'Las reglas son obligatorias para solicitar la activación',
      );
      expect(tarjetas().length).toBe(1);
      expect(dialogo().open).toBeFalse();
      expect(repository.listar).not.toHaveBeenCalled();
    });

    it('un 409 muestra el mensaje del backend y recarga', () => {
      repository.reactivar.and.returnValue(
        throwError(
          () =>
            new TransicionNoPermitidaError(
              'La publicación está en revisión: se aprueba, no se reactiva',
            ),
        ),
      );
      abrirReactivar('Pausadas', 'PAUSADA');
      repository.listar.calls.reset();
      repository.listar.and.returnValue(of(pagina([])));

      escribirMotivo(MOTIVO);
      boton(dialogo(), 'Reactivar publicación').click();
      fixture.detectChanges();

      expect(
        toast
          .toasts()
          .some(
            (t) =>
              t.title === 'No se pudo reactivar' &&
              t.message === 'La publicación está en revisión: se aprueba, no se reactiva',
          ),
      ).toBeTrue();
      expect(repository.listar).toHaveBeenCalledOnceWith('PAUSADA', 0, 10);
    });
  });
});
