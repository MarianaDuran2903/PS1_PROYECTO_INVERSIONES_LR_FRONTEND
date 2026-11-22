/**
 * Clave única para un intento de reserva (encabezado `Idempotency-Key`). Usa `randomUUID` y, si el
 * navegador no lo ofrece (por ejemplo, en una página que no es un contexto seguro), arma un UUID v4
 * con `getRandomValues`.
 */
export function generarClaveIdempotencia(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Versión 4 y variante RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
