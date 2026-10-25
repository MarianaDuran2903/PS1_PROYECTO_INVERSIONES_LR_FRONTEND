import { RegistroUsuario, UsuarioRegistrado } from '../../domain/models/registro-usuario';
import { RolUsuario } from '../../domain/models/rol-usuario';
import { RegistrarUsuarioRequestDto, UsuarioResponseDto } from '../dtos/registro-usuario.dto';

const ROLES_VALIDOS = new Set<string>(Object.values(RolUsuario));

/** Adapter entre el modelo de dominio y los DTO del API. */
export const RegistroUsuarioMapper = {
  toRequest(datos: RegistroUsuario): RegistrarUsuarioRequestDto {
    return {
      rol: datos.rol,
      primerNombre: normalizarTexto(datos.primerNombre),
      segundoNombre: normalizarOpcional(datos.segundoNombre),
      primerApellido: normalizarTexto(datos.primerApellido),
      segundoApellido: normalizarOpcional(datos.segundoApellido),
      correo: datos.correo.trim().toLowerCase(),
      // La contraseña se envía tal cual: el backend la convierte en hash.
      contrasena: datos.contrasena,
    };
  },

  toDomain(dto: UsuarioResponseDto): UsuarioRegistrado {
    return {
      idUsuario: dto.idUsuario,
      primerNombre: dto.primerNombre,
      primerApellido: dto.primerApellido,
      correo: dto.correo,
      roles: dto.roles.filter((rol): rol is RolUsuario => ROLES_VALIDOS.has(rol)),
    };
  },
};

function normalizarTexto(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarOpcional(valor: string | undefined): string | null {
  const normalizado = normalizarTexto(valor ?? '');
  return normalizado.length > 0 ? normalizado : null;
}
