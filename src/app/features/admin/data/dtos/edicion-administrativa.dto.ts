import { ActualizarPublicacionRequestDto } from '@features/publicaciones/data/dtos/publicacion.dto';

/**
 * Cuerpo de PUT {apiUrl}/admin/publicaciones/{id}: el motivo (10 a 500 caracteres, queda en la
 * auditoría) y los nuevos datos, que siguen las mismas reglas que la edición del Anfitrión.
 */
export interface EdicionAdministrativaRequestDto {
  motivo: string;
  cambios: ActualizarPublicacionRequestDto;
}
