import { ApiError } from '@core/http/api-error';
import {
  IntentosDePagoAgotadosError,
  PagoNoIniciadoError,
  PasarelaDePagoNoDisponibleError,
  ReservaNoAdmitePagoError,
  ReservaNoEncontradaError,
  ReservaYaPagadaError,
  SinPermisoSobreReservaError,
} from '../domain/errors/pago.errors';
import { clasificarErrorPago, MENSAJE_PASARELA } from './errores-pago';

describe('clasificarErrorPago', () => {
  const casos: [string, unknown, string][] = [
    ['ya pagada', new ReservaYaPagadaError(), 'ya-pagada'],
    ['sin pago posible', new ReservaNoAdmitePagoError(), 'no-admite-pago'],
    ['intentos agotados', new IntentosDePagoAgotadosError(), 'intentos-agotados'],
    ['pasarela', new PasarelaDePagoNoDisponibleError(), 'pasarela'],
    ['reserva inexistente', new ReservaNoEncontradaError(), 'no-encontrada'],
    ['pago no iniciado', new PagoNoIniciadoError(), 'sin-pago'],
    ['sin permiso', new SinPermisoSobreReservaError(), 'sin-permiso'],
  ];

  for (const [nombre, error, tipo] of casos) {
    it(`clasifica "${nombre}" como ${tipo}`, () => {
      expect(clasificarErrorPago(error).tipo as string).toBe(tipo);
    });
  }

  it('conserva el mensaje del backend', () => {
    expect(clasificarErrorPago(new ReservaYaPagadaError('Ya está pagada')).mensaje).toBe(
      'Ya está pagada',
    );
  });

  it('la pasarela usa un mensaje propio de la pantalla', () => {
    expect(clasificarErrorPago(new PasarelaDePagoNoDisponibleError('técnico')).mensaje).toBe(
      MENSAJE_PASARELA,
    );
  });

  it('cualquier otro error queda como "otro" con su mensaje', () => {
    const resultado = clasificarErrorPago(new ApiError(500, 'HTTP_500', 'Error inesperado'));

    expect(resultado).toEqual({ tipo: 'otro', mensaje: 'Error inesperado' });
  });

  it('un valor que no es un error usa un mensaje genérico', () => {
    const resultado = clasificarErrorPago('algo');

    expect(resultado.tipo).toBe('otro');
    expect(resultado.mensaje).toContain('No fue posible completar la operación');
  });
});
