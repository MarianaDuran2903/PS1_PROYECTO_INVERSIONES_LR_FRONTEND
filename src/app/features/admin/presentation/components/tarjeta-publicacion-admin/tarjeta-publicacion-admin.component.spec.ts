import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  AccionAdministrador,
  EstadoPublicacion,
  Publicacion,
} from '@features/publicaciones/domain/models/publicacion';
import { TarjetaPublicacionAdminComponent } from './tarjeta-publicacion-admin.component';

/** HU-013 y HU-015: la tarjeta de una publicación para el Administrador. */
describe('TarjetaPublicacionAdminComponent', () => {
  const publicacion = (
    estado: EstadoPublicacion = 'PENDIENTE_REVISION',
    extra: Partial<Publicacion> = {},
  ): Publicacion => ({
    idPublicacion: 4,
    idAnfitrion: 34,
    estado,
    titulo: 'Casa renovada',
    descripcion: 'Descripción de la casa',
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

  let fixture: ComponentFixture<TarjetaPublicacionAdminComponent>;
  let element: HTMLElement;
  let acciones: AccionAdministrador[];

  const mostrar = (datos: Publicacion, extra: Record<string, unknown> = {}) => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(TarjetaPublicacionAdminComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('publicacion', datos);
    for (const [clave, valor] of Object.entries(extra)) {
      fixture.componentRef.setInput(clave, valor);
    }
    acciones = [];
    fixture.componentInstance.accionar.subscribe((a) => acciones.push(a));
    fixture.detectChanges();
  };
  const botones = () =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('footer button')).map((b) =>
      b.textContent!.trim(),
    );
  const boton = (texto: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;

  describe('resumen', () => {
    it('muestra título, número, «Anfitrión #id», tipo, ciudad, precio y estado', () => {
      mostrar(publicacion());

      const texto = element.textContent!;
      for (const esperado of [
        'Casa renovada',
        'Publicación n.º 4',
        'Anfitrión #34',
        'Casa',
        'Bogotá',
        '250.000',
        'por noche',
      ]) {
        expect(texto).withContext(esperado).toContain(esperado);
      }
      expect(element.querySelector('app-estado-publicacion')!.textContent!.trim()).toBe(
        'Pendiente de revisión',
      );
    });

    it('el host lleva la clase "tarjeta"', () => {
      mostrar(publicacion());

      expect(element.classList.contains('tarjeta')).toBeTrue();
    });

    it('el título enlaza al detalle de la publicación', () => {
      mostrar(publicacion());

      expect(element.querySelector('.tarjeta__titulo a')!.getAttribute('href')).toBe(
        '/admin/publicaciones/4',
      );
    });

    it('con conEnlace en false el título es solo texto', () => {
      mostrar(publicacion(), { conEnlace: false });

      expect(element.querySelector('.tarjeta__titulo a')).toBeNull();
      expect(element.querySelector('.tarjeta__titulo')!.textContent).toContain('Casa renovada');
    });

    it('en modo resumen no muestra dirección, descripción ni reglas', () => {
      mostrar(publicacion());

      expect(element.textContent).not.toContain('Calle 10 # 5-20');
      expect(element.textContent).not.toContain('Descripción de la casa');
      expect(element.textContent).not.toContain('No fumar');
    });
  });

  describe('modo completo', () => {
    it('muestra toda la información para decidir', () => {
      mostrar(publicacion(), { completa: true });

      const texto = element.textContent!;
      for (const esperado of [
        'Calle 10 # 5-20',
        'Chapinero',
        'Flexible',
        '4 huéspedes',
        '30.000',
        'Descripción de la casa',
        'No fumar',
      ]) {
        expect(texto).withContext(esperado).toContain(esperado);
      }
    });

    it('sin barrio ni reglas lo dice en lugar de dejar el campo en blanco', () => {
      mostrar(publicacion('PENDIENTE_REVISION', { barrioZona: null, reglas: null }), {
        completa: true,
      });

      expect(element.textContent).toContain('Sin indicar');
      expect(element.textContent).toContain('El Anfitrión no escribió reglas.');
    });

    it('una capacidad de 1 se escribe en singular', () => {
      mostrar(publicacion('PENDIENTE_REVISION', { capacidad: 1 }), { completa: true });

      expect(element.textContent).toContain('1 huésped');
      expect(element.textContent).not.toContain('1 huéspedes');
    });
  });

  describe('motivo del bloqueo', () => {
    it('una publicación bloqueada lo muestra destacado', () => {
      mostrar(publicacion('BLOQUEADA', { motivoBloqueo: 'Las fotos no corresponden' }));

      const aviso = element.querySelector('.tarjeta__bloqueo')!;
      expect(aviso.textContent).toContain('Motivo del bloqueo:');
      expect(aviso.textContent).toContain('Las fotos no corresponden');
      expect(aviso.getAttribute('role')).toBe('note');
    });

    it('sin motivo de bloqueo no aparece el recuadro', () => {
      mostrar(publicacion('PAUSADA'));

      expect(element.querySelector('.tarjeta__bloqueo')).toBeNull();
    });
  });

  describe('botones según el estado', () => {
    const esperados: [EstadoPublicacion, string[]][] = [
      ['BORRADOR', []],
      ['PENDIENTE_REVISION', ['Aprobar', 'Rechazar', 'Bloquear']],
      ['ACTIVA', ['Bloquear']],
      ['PAUSADA', ['Reactivar', 'Bloquear']],
      ['BLOQUEADA', ['Reactivar']],
    ];
    for (const [estado, textos] of esperados) {
      it(`${estado}: ${textos.length > 0 ? textos.join(', ') : 'sin botones'}`, () => {
        mostrar(publicacion(estado));

        expect(botones()).toEqual(textos);
        expect(element.querySelector('footer') !== null).toBe(textos.length > 0);
      });
    }

    it('quien la usa puede pasar las acciones a mostrar', () => {
      mostrar(publicacion('PENDIENTE_REVISION'), { acciones: ['aprobar', 'rechazar'] });

      expect(botones()).toEqual(['Aprobar', 'Rechazar']);
    });

    it('cada botón emite su acción', () => {
      mostrar(publicacion('PAUSADA'));

      boton('Reactivar').click();
      boton('Bloquear').click();

      expect(acciones).toEqual(['reactivar', 'bloquear']);
    });
  });

  describe('mientras hay una decisión en curso', () => {
    it('deshabilita todos los botones', () => {
      mostrar(publicacion(), { ocupado: true });

      for (const b of Array.from(element.querySelectorAll<HTMLButtonElement>('footer button'))) {
        expect(b.disabled).toBeTrue();
      }
    });

    it('el botón de la acción en curso muestra su texto de espera y aria-busy', () => {
      mostrar(publicacion('BLOQUEADA'), { ocupado: true, accionEnCurso: 'reactivar' });

      expect(boton('Reactivando').getAttribute('aria-busy')).toBe('true');
      expect(botones()).toEqual(['Reactivando…']);
    });

    it('cada acción tiene su texto de espera', () => {
      const textos: [AccionAdministrador, string][] = [
        ['aprobar', 'Aprobando…'],
        ['rechazar', 'Rechazando…'],
        ['bloquear', 'Bloqueando…'],
      ];
      for (const [accion, esperado] of textos) {
        TestBed.resetTestingModule();
        mostrar(publicacion(), { ocupado: true, accionEnCurso: accion });

        expect(botones()).withContext(accion).toContain(esperado);
      }
    });
  });

  describe('aviso de información mínima', () => {
    const aviso = {
      mensaje: 'La publicación no tiene la información mínima para activarse',
      pendientes: [
        { campo: 'reglas', mensaje: 'Las reglas son obligatorias para solicitar la activación' },
      ],
    };

    it('muestra el mensaje, cada campo pendiente y el enlace para intervenir', () => {
      mostrar(publicacion(), { aviso });

      const caja = element.querySelector('.tarjeta__aviso')!;
      expect(caja.textContent).toContain(aviso.mensaje);
      expect(caja.querySelector('li')!.textContent).toContain(
        'Las reglas son obligatorias para solicitar la activación',
      );
      expect(caja.querySelector('a')!.getAttribute('href')).toBe('/admin/publicaciones/4/editar');
      expect(caja.getAttribute('role')).toBe('alert');
    });

    it('sin aviso no aparece', () => {
      mostrar(publicacion());

      expect(element.querySelector('.tarjeta__aviso')).toBeNull();
    });
  });
});
