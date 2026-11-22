/**
 * Convierte el identificador que llega en la URL en un número, o `null` si no es un entero
 * positivo (en ese caso la reserva no puede existir y no se consulta al backend).
 */
export function idReservaValido(valor: string | null | undefined): number | null {
  if (valor === null || valor === undefined || !/^[1-9]\d*$/.test(valor)) {
    return null;
  }
  const numero = Number(valor);
  return Number.isSafeInteger(numero) ? numero : null;
}
