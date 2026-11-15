import { Publicacion } from '@features/publicaciones/domain/models/publicacion';
import { AccionConMotivo } from '../application/decisiones-publicacion.facade';

/** Textos del cuadro del motivo (`app-modal-motivo`) para una acción del Administrador. */
export interface TextosModalMotivo {
  titulo: string;
  ayuda: string;
  etiqueta: string;
  textoConfirmar: string;
}

/**
 * Arma los textos del cuadro del motivo para rechazar, bloquear o reactivar una publicación. Al
 * reactivar una bloqueada se muestra el motivo del bloqueo, para decidir con esa información.
 */
export function textosDelModal(
  accion: AccionConMotivo,
  publicacion: Pick<Publicacion, 'titulo' | 'motivoBloqueo'> | null,
): TextosModalMotivo {
  const nombre = publicacion ? `«${publicacion.titulo}»` : 'la publicación';

  switch (accion) {
    case 'rechazar':
      return {
        titulo: `Rechazar ${nombre}`,
        ayuda:
          'Explica qué debe corregir el Anfitrión. La publicación volverá a borrador y el motivo queda registrado.',
        etiqueta: 'Motivo del rechazo',
        textoConfirmar: 'Rechazar publicación',
      };
    case 'bloquear':
      return {
        titulo: `Bloquear ${nombre}`,
        ayuda:
          'Explica por qué la publicación es engañosa. Dejará de ofrecerse y el Anfitrión verá este motivo.',
        etiqueta: 'Motivo del bloqueo',
        textoConfirmar: 'Bloquear publicación',
      };
    case 'reactivar': {
      const bloqueo = publicacion?.motivoBloqueo
        ? `Motivo del bloqueo: «${publicacion.motivoBloqueo}». `
        : '';
      return {
        titulo: `Reactivar ${nombre}`,
        ayuda: `${bloqueo}Explica por qué se reactiva. La publicación volverá a estar activa y el motivo queda registrado.`,
        etiqueta: 'Motivo de la reactivación',
        textoConfirmar: 'Reactivar publicación',
      };
    }
  }
}
