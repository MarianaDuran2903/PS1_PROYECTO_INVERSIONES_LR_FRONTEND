import { textosDelModal } from './textos-modal-motivo';

describe('textosDelModal', () => {
  const bloqueada = { titulo: 'Casa renovada', motivoBloqueo: 'Las fotos no corresponden' };
  const pausada = { titulo: 'Casa renovada', motivoBloqueo: null };

  it('rechazar: nombra la publicación y explica que vuelve a borrador', () => {
    const textos = textosDelModal('rechazar', pausada);

    expect(textos.titulo).toBe('Rechazar «Casa renovada»');
    expect(textos.etiqueta).toBe('Motivo del rechazo');
    expect(textos.textoConfirmar).toBe('Rechazar publicación');
    expect(textos.ayuda).toContain('volverá a borrador');
  });

  it('bloquear: explica que dejará de ofrecerse y que el Anfitrión verá el motivo', () => {
    const textos = textosDelModal('bloquear', pausada);

    expect(textos.titulo).toBe('Bloquear «Casa renovada»');
    expect(textos.etiqueta).toBe('Motivo del bloqueo');
    expect(textos.textoConfirmar).toBe('Bloquear publicación');
    expect(textos.ayuda).toContain('el Anfitrión verá este motivo');
  });

  it('reactivar una bloqueada muestra el motivo del bloqueo antes de decidir', () => {
    const textos = textosDelModal('reactivar', bloqueada);

    expect(textos.titulo).toBe('Reactivar «Casa renovada»');
    expect(textos.etiqueta).toBe('Motivo de la reactivación');
    expect(textos.textoConfirmar).toBe('Reactivar publicación');
    expect(textos.ayuda).toContain('Motivo del bloqueo: «Las fotos no corresponden».');
  });

  it('reactivar una pausada (sin motivo de bloqueo) no menciona ningún bloqueo', () => {
    const textos = textosDelModal('reactivar', pausada);

    expect(textos.ayuda).not.toContain('Motivo del bloqueo');
    expect(textos.ayuda).toContain('Explica por qué se reactiva');
  });

  it('sin publicación habla de "la publicación"', () => {
    expect(textosDelModal('bloquear', null).titulo).toBe('Bloquear la publicación');
    expect(textosDelModal('reactivar', null).ayuda).not.toContain('Motivo del bloqueo');
  });
});
