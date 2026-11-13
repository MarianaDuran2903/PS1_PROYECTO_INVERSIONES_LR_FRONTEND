import {
  EstadoPublicacion,
  motivoNoEditable,
  puedeEditar,
  puedeEnviarARevision,
} from './publicacion';

describe('puedeEnviarARevision', () => {
  const estados: [EstadoPublicacion, boolean][] = [
    ['BORRADOR', true],
    ['PENDIENTE_REVISION', false],
    ['ACTIVA', false],
    ['PAUSADA', false],
    ['BLOQUEADA', false],
  ];
  for (const [estado, esperado] of estados) {
    it(`${estado}: ${esperado ? 'se puede' : 'no se puede'} enviar a revisión`, () => {
      expect(puedeEnviarARevision(estado)).toBe(esperado);
    });
  }
});

describe('reglas de edición de una publicación', () => {
  it('se puede editar solo en BORRADOR y PAUSADA', () => {
    expect(puedeEditar('BORRADOR')).toBeTrue();
    expect(puedeEditar('PAUSADA')).toBeTrue();
    expect(puedeEditar('ACTIVA')).toBeFalse();
    expect(puedeEditar('PENDIENTE_REVISION')).toBeFalse();
    expect(puedeEditar('BLOQUEADA')).toBeFalse();
  });

  it('explica por qué no se puede editar en cada estado', () => {
    expect(motivoNoEditable('ACTIVA')).toBe(
      'Esta publicación está activa. Para editarla, solicita al Administrador que la pause.',
    );
    expect(motivoNoEditable('PENDIENTE_REVISION')).toBe(
      'La publicación está en revisión del Administrador.',
    );
    expect(motivoNoEditable('BLOQUEADA')).toBe('La publicación está bloqueada.');
  });

  it('no da motivo cuando sí se puede editar', () => {
    const editables: EstadoPublicacion[] = ['BORRADOR', 'PAUSADA'];

    for (const estado of editables) {
      expect(motivoNoEditable(estado)).toBeNull();
    }
  });
});
