const FORMATO = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Fecha y hora legibles, en la zona horaria de la persona, a partir de un instante ISO 8601 (el
 * backend manda UTC). Devuelve `null` si el valor no es una fecha válida.
 */
export function fechaLegible(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : FORMATO.format(fecha);
}
