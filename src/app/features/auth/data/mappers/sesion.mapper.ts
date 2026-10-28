import { Credenciales, Sesion, SesionActiva } from '../../domain/models/sesion';
import { LoginRequestDto, LoginResponseDto, SesionResponseDto } from '../dtos/sesion.dto';
import { RegistroUsuarioMapper } from './registro-usuario.mapper';

export const SesionMapper = {
  toRequest(credenciales: Credenciales): LoginRequestDto {
    return {
      correo: credenciales.correo.trim(),
      contrasena: credenciales.contrasena,
    };
  },

  /** `ahora` permite fijar el reloj en las pruebas. */
  toDomain(dto: LoginResponseDto, ahora = Date.now()): Sesion {
    return {
      accessToken: dto.token,
      expiraEn: ahora + dto.expiraEn * 1000,
      usuario: RegistroUsuarioMapper.toDomain(dto.usuario),
    };
  },

  toSesionActiva(dto: SesionResponseDto): SesionActiva {
    return {
      usuario: RegistroUsuarioMapper.toDomain(dto.usuario),
      expiraEn: Date.parse(dto.expiraEn),
    };
  },
};
