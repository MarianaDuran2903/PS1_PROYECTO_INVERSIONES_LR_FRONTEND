import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { Observable, Subject } from 'rxjs';
import {
  AlojamientoNoReservableError,
  FechasNoDisponiblesParaReservarError,
  ReservaInvalidaError,
  SinPermisoParaReservarError,
} from '../../../domain/errors/reserva.errors';
import { Reserva, SolicitudReserva } from '../../../domain/models/reserva';
import { ReservaRepository } from '../../../domain/repositories/reserva.repository';
import { AccionReservarComponent } from './accion-reservar.component';

class RepositorioFalso extends ReservaRepository {
  readonly llamadas: { solicitud: SolicitudReserva; clave: string }[] = [];
  readonly respuestas: Subject<Reserva>[] = [];

  override crear(solicitud: SolicitudReserva, clave: string): Observable<Reserva> {
    this.llamadas.push({ solicitud, clave });
    const respuesta = new Subject<Reserva>();
    this.respuestas.push(respuesta);
    return respuesta;
  }

  get ultima(): Subject<Reserva> {
    return this.respuestas[this.respuestas.length - 1];
  }
}

const reserva: Reserva = {
  idReserva: 2,
  idPublicacion: 26,
  fechaLlegada: '2026-12-20',
  fechaSalida: '2026-12-23',
  noches: 3,
  huespedes: 2,
  estado: 'PENDIENTE_PAGO',
  fechaExpiracion: '2026-11-22T06:19:18Z',
  precio: {
    precioBase: 540000,
    porcentajeDescuento: 0,
    valorDescuento: 0,
    tarifaLimpieza: 0,
    porcentajeTarifaServicio: 10,
    tarifaServicio: 54000,
    total: 594000,
  },
};

describe('AccionReservarComponent', () => {
  const solicitud: SolicitudReserva = {
    idPublicacion: 26,
    fechaLlegada: '2026-12-20',
    fechaSalida: '2026-12-23',
    huespedes: 2,
  };

  let fixture: ComponentFixture<AccionReservarComponent>;
  let element: HTMLElement;
  let repositorio: RepositorioFalso;
  let navegar: jasmine.Spy;
  let ocupadas: number;

  const boton = () => element.querySelector<HTMLButtonElement>('button')!;
  const alerta = () => element.querySelector('[role="alert"]');
  const reservar = () => {
    boton().click();
    fixture.detectChanges();
  };
  const fallar = (error: unknown) => {
    reservar();
    repositorio.ultima.error(error);
    fixture.detectChanges();
  };

  beforeEach(() => {
    repositorio = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ReservaRepository, useValue: repositorio }],
    });
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(AccionReservarComponent);
    element = fixture.nativeElement as HTMLElement;
    ocupadas = 0;
    fixture.componentInstance.fechasOcupadas.subscribe(() => ocupadas++);
    fixture.componentRef.setInput('solicitud', solicitud);
    fixture.detectChanges();
  });

  it('muestra «Reservar y pagar» y explica que se apartan las fechas mientras se paga', () => {
    expect(boton().textContent).toContain('Reservar y pagar');
    expect(boton().disabled).toBeFalse();
    expect(element.textContent).toContain('apartamos estas fechas mientras pagas');
    expect(element.textContent).toContain('sin cobro real');
    expect(alerta()).toBeNull();
  });

  it('no llama al backend hasta que la persona pulsa', () => {
    expect(repositorio.llamadas).toEqual([]);
  });

  it('al pulsar reserva exactamente lo cotizado, con una clave de idempotencia', () => {
    reservar();

    expect(repositorio.llamadas).toHaveSize(1);
    expect(repositorio.llamadas[0].solicitud).toEqual(solicitud);
    expect(repositorio.llamadas[0].clave).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('mientras reserva, deshabilita el botón y lo anuncia como ocupado', () => {
    reservar();

    expect(boton().disabled).toBeTrue();
    expect(boton().getAttribute('aria-busy')).toBe('true');
    expect(boton().textContent).toContain('Reservando');
  });

  it('al crearse la reserva lleva a pagarla', () => {
    reservar();

    repositorio.ultima.next(reserva);

    expect(navegar).toHaveBeenCalledOnceWith(['/reservas', 2, 'pago']);
  });

  it('no lleva a pagar si la reserva no se pudo crear', () => {
    fallar(new FechasNoDisponiblesParaReservarError());

    expect(navegar).not.toHaveBeenCalled();
  });

  describe('errores', () => {
    it('409: avisa que alguien más pudo tomar las fechas y pide la cotización de nuevo', () => {
      fallar(new FechasNoDisponiblesParaReservarError());

      expect(alerta()!.textContent).toContain('Las fechas seleccionadas no están disponibles');
      expect(alerta()!.textContent).toContain('Prueba con otras fechas');
      expect(ocupadas).toBe(1);
    });

    it('404: ofrece volver al listado', () => {
      fallar(new AlojamientoNoReservableError());

      const enlace = alerta()!.querySelector<HTMLAnchorElement>('a')!;
      expect(alerta()!.textContent).toContain('El alojamiento no está disponible');
      expect(enlace.textContent).toContain('Volver al listado');
      expect(new URL(enlace.href).pathname).toBe('/alojamientos');
      expect(ocupadas).toBe(0);
    });

    it('403: explica que solo los Huéspedes reservan', () => {
      fallar(new SinPermisoParaReservarError());

      expect(alerta()!.textContent).toContain('Solo los Huéspedes pueden reservar');
    });

    it('400: lista los mensajes del servidor', () => {
      fallar(
        new ReservaInvalidaError({
          huespedes: 'El alojamiento admite como máximo 2 huéspedes',
          fechaLlegada: 'La fecha de llegada no puede ser anterior a hoy',
        }),
      );

      const mensajes = Array.from(alerta()!.querySelectorAll('p')).map((p) => p.textContent);
      expect(mensajes).toContain('El alojamiento admite como máximo 2 huéspedes');
      expect(mensajes).toContain('La fecha de llegada no puede ser anterior a hoy');
    });

    it('otro fallo: muestra su mensaje y se puede volver a intentar con la misma clave', () => {
      fallar(new ApiError(0, 'NETWORK_ERROR', 'No fue posible conectar con el servidor.'));

      expect(alerta()!.textContent).toContain('No fue posible conectar con el servidor.');
      expect(boton().disabled).toBeFalse();

      reservar();

      expect(repositorio.llamadas).toHaveSize(2);
      expect(repositorio.llamadas[1].clave).toBe(repositorio.llamadas[0].clave);
    });

    it('el aviso del error reemplaza a la nota explicativa', () => {
      fallar(new SinPermisoParaReservarError());

      expect(element.querySelector('.reservar__nota')).toBeNull();
    });
  });

  it('si cambian los datos, el aviso anterior desaparece', () => {
    fallar(new AlojamientoNoReservableError());
    expect(alerta()).not.toBeNull();

    fixture.componentRef.setInput('solicitud', { ...solicitud, fechaSalida: '2026-12-24' });
    fixture.detectChanges();

    expect(alerta()).toBeNull();
    expect(element.querySelector('.reservar__nota')).not.toBeNull();
  });
});
