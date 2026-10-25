import { Credenciales, Sesion } from '../../domain/models/sesion';
import { LoginRequestDto, LoginResponseDto } from '../dtos/sesion.dto';
import { RegistroUsuarioMapper } from './registro-usuario.mapper';

export const SesionMapper = {
  toRequest(credenciales: Credenciales): LoginRequestDto {
    return {
      correo: credenciales.correo.trim().toLowerCase(),
      contrasena: credenciales.contrasena,
    };
  },

  toDomain(dto: LoginResponseDto): Sesion {
    return {
      accessToken: dto.accessToken,
      usuario: RegistroUsuarioMapper.toDomain(dto.usuario),
    };
  },
};
