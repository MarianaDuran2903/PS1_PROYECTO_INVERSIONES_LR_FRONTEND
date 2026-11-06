import { EstadoPublicacion } from '@features/publicaciones/domain/models/publicacion';
import {
  exigeReglas,
  motivoNoIntervenible,
  MOTIVO_PUBLICACION_ACTIVA,
  puedeIntervenir,
} from './intervencion';

describe('reglas de la intervención administrativa', () => {
  const todos: EstadoPublicacion[] = [
    'BORRADOR',
    'PENDIENTE_REVISION',
    'ACTIVA',
    'PAUSADA',
    'BLOQUEADA',
  ];

  it('se puede intervenir en cualquier estado salvo ACTIVA', () => {
    expect(todos.filter(puedeIntervenir)).toEqual([
      'BORRADOR',
      'PENDIENTE_REVISION',
      'PAUSADA',
      'BLOQUEADA',
    ]);
    expect(puedeIntervenir('ACTIVA')).toBeFalse();
  });

  it('una ACTIVA no se interviene y el motivo es el mensaje del backend', () => {
    expect(motivoNoIntervenible('ACTIVA')).toBe(MOTIVO_PUBLICACION_ACTIVA);
    expect(MOTIVO_PUBLICACION_ACTIVA).toBe(
      'La publicación está activa: páusela antes de intervenirla',
    );
  });

  it('en los demás estados no hay motivo para impedirlo', () => {
    for (const estado of todos.filter((e) => e !== 'ACTIVA')) {
      expect(motivoNoIntervenible(estado)).toBeNull();
    }
  });

  it('las reglas son obligatorias solo en PENDIENTE_REVISION', () => {
    expect(todos.filter(exigeReglas)).toEqual(['PENDIENTE_REVISION']);
  });
});
