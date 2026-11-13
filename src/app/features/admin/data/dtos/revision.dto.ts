/**
 * Cuerpo de POST {apiUrl}/admin/publicaciones/{id}/rechazar, /bloquear y /reactivar: las tres
 * acciones piden el motivo (de 10 a 500 caracteres).
 */
export interface MotivoPublicacionRequestDto {
  motivo: string;
}
