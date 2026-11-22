import { RegistroUsuario, UsuarioRegistrado } from '../../domain/models/registro-usuario';
import { RolUsuario } from '../../domain/models/rol-usuario';
import { RegistroUsuarioRequestDto, UsuarioResponseDto } from '../dtos/registro-usuario.dto';

/** Adapter entre el modelo de dominio y los DTO del API. */
export const RegistroUsuarioMapper = {
  /** El rol se descarta a propósito: lo decide el endpoint, no el cuerpo. */
  toRequest(datos: RegistroUsuario): RegistroUsuarioRequestDto {
    return {
      primerNombre: datos.primerNombre.trim(),
      segundoNombre: normalizarOpcional(datos.segundoNombre),
      primerApellido: datos.primerApellido.trim(),
      segundoApellido: normalizarOpcional(datos.segundoApellido),
      correo: datos.correo.trim(),
      // Las contraseñas se envían tal cual: el backend valida y convierte en hash.
      contrasena: datos.contrasena,
      confirmarContrasena: datos.confirmarContrasena,
    };
  },

  toDomain(dto: UsuarioResponseDto): UsuarioRegistrado {
    return {
      idUsuario: dto.idUsuario,
      primerNombre: dto.primerNombre,
      primerApellido: dto.primerApellido,
      correo: dto.correo,
      roles: [dto.rol as RolUsuario],
    };
  },
};

function normalizarOpcional(valor: string | undefined): string | null {
  const normalizado = (valor ?? '').trim();
  return normalizado.length > 0 ? normalizado : null;
}
