import { EstadoPublicacion } from '@features/publicaciones/domain/models/publicacion';

/** Mensaje del backend cuando se intenta intervenir una publicación ACTIVA. */
export const MOTIVO_PUBLICACION_ACTIVA =
  'La publicación está activa: páusela antes de intervenirla';

/**
 * El Administrador interviene en cualquier estado salvo ACTIVA: lo que ya se ve en las búsquedas
 * se pausa antes de modificarse.
 */
export function puedeIntervenir(estado: EstadoPublicacion): boolean {
  return estado !== 'ACTIVA';
}

/** Por qué no se puede intervenir en ese estado; null si sí se puede. */
export function motivoNoIntervenible(estado: EstadoPublicacion): string | null {
  return puedeIntervenir(estado) ? null : MOTIVO_PUBLICACION_ACTIVA;
}

/** En revisión la publicación debe tener sus reglas: el backend rechaza vaciarlas. */
export function exigeReglas(estado: EstadoPublicacion): boolean {
  return estado === 'PENDIENTE_REVISION';
}
