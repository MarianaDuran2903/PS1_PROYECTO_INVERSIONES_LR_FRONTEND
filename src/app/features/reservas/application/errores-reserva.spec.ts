import { ApiError } from '@core/http/api-error';
import {
  AlojamientoNoReservableError,
  FechasNoDisponiblesParaReservarError,
  ReservaInvalidaError,
  SinPermisoParaReservarError,
} from '../domain/errors/reserva.errors';
import { clasificarErrorReserva, esFalloIncierto } from './errores-reserva';

describe('clasificarErrorReserva', () => {
  it('fechas no disponibles', () => {
    const resultado = clasificarErrorReserva(new FechasNoDisponiblesParaReservarError());

    expect(resultado.tipo).toBe('fechas-no-disponibles');
    expect(resultado.mensaje).toBe('Las fechas seleccionadas no están disponibles');
  });

  it('alojamiento no disponible', () => {
    expect(clasificarErrorReserva(new AlojamientoNoReservableError()).tipo).toBe(
      'alojamiento-no-disponible',
    );
  });

  it('sin permiso', () => {
    expect(clasificarErrorReserva(new SinPermisoParaReservarError()).tipo).toBe('sin-permiso');
  });

  it('datos inválidos, con los mensajes por campo', () => {
    const resultado = clasificarErrorReserva(
      new ReservaInvalidaError({ huespedes: 'El alojamiento admite como máximo 2 huéspedes' }),
    );

    expect(resultado.tipo).toBe('invalida');
    expect(resultado.errores).toEqual({
      huespedes: 'El alojamiento admite como máximo 2 huéspedes',
    });
  });

  it('cualquier otro error queda como "otro" con su mensaje', () => {
    expect(clasificarErrorReserva(new ApiError(409, 'HTTP_409', 'Clave ya usada'))).toEqual({
      tipo: 'otro',
      mensaje: 'Clave ya usada',
      errores: {},
    });
  });

  it('un valor que no es un error usa un mensaje genérico', () => {
    const resultado = clasificarErrorReserva('algo');

    expect(resultado.tipo).toBe('otro');
    expect(resultado.mensaje).toContain('No fue posible crear la reserva');
  });
});

describe('esFalloIncierto', () => {
  it('un corte de red y un fallo del servidor no dicen si se creó la reserva', () => {
    expect(esFalloIncierto(new ApiError(0, 'NETWORK_ERROR', 'Sin conexión'))).toBeTrue();
    expect(esFalloIncierto(new ApiError(500, 'HTTP_500', 'Error'))).toBeTrue();
    expect(esFalloIncierto(new ApiError(503, 'HTTP_503', 'Error'))).toBeTrue();
  });

  it('una respuesta definitiva (4xx) sí lo dice', () => {
    expect(esFalloIncierto(new ApiError(409, 'HTTP_409', 'Fechas'))).toBeFalse();
    expect(esFalloIncierto(new ApiError(400, 'HTTP_400', 'Datos'))).toBeFalse();
    expect(esFalloIncierto(new FechasNoDisponiblesParaReservarError())).toBeFalse();
  });
});
