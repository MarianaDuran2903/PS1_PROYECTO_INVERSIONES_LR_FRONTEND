/**
 * Lee el id de una publicación que llega como texto en la URL. Un id válido son solo dígitos y es
 * mayor que 0: "12" sí; "abc", "1.5", "-3" o "0" no (devuelven null).
 */
export function leerIdPublicacion(texto: string | undefined): number | null {
  if (texto === undefined || !/^\d+$/.test(texto)) {
    return null;
  }
  const id = Number(texto);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
