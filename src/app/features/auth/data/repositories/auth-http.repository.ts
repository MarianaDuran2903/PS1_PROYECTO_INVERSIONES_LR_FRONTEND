import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { catchError, map, Observable, throwError } from 'rxjs';
import { CredencialesInvalidasError } from '../../domain/errors/login.errors';
import {
  EnlaceRecuperacionInvalidoError,
  RestablecimientoInvalidoError,
  SolicitudRecuperacionInvalidaError,
} from '../../domain/errors/recuperacion.errors';
import {
  CampoRestablecimiento,
  ErroresRestablecimiento,
  RestablecerContrasena,
} from '../../domain/models/recuperacion';
import {
  CorreoYaRegistradoError,
  RegistroInvalidoError,
} from '../../domain/errors/registro.errors';
import {
  CampoRegistroUsuario,
  ErroresRegistro,
  RegistroUsuario,
  UsuarioRegistrado,
} from '../../domain/models/registro-usuario';
import { RolRegistrable, RolUsuario } from '../../domain/models/rol-usuario';
import { Credenciales, Sesion, SesionActiva } from '../../domain/models/sesion';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import {
  MensajeResponseDto,
  RestablecerContrasenaRequestDto,
  SolicitudRecuperacionRequestDto,
} from '../dtos/recuperacion.dto';
import { UsuarioResponseDto } from '../dtos/registro-usuario.dto';
import { LoginResponseDto, SesionResponseDto } from '../dtos/sesion.dto';
import { RegistroUsuarioMapper } from '../mappers/registro-usuario.mapper';
import { SesionMapper } from '../mappers/sesion.mapper';

const CAMPOS: readonly CampoRegistroUsuario[] = [
  'primerNombre',
  'segundoNombre',
  'primerApellido',
  'segundoApellido',
  'correo',
  'contrasena',
  'confirmarContrasena',
];

const CAMPOS_RESTABLECIMIENTO: readonly CampoRestablecimiento[] = [
  'token',
  'contrasena',
  'confirmarContrasena',
];

/** Segmento final de la URL de registro según el rol elegido. */
const ENDPOINT_REGISTRO: Record<RolRegistrable, string> = {
  [RolUsuario.Huesped]: 'huesped',
  [RolUsuario.Anfitrion]: 'anfitrion',
};

/** Implementación del puerto AuthRepository contra el API REST del backend. */
@Injectable()
export class AuthHttpRepository extends AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_CONFIG).apiUrl}/auth`;

  override registrarUsuario(datos: RegistroUsuario): Observable<UsuarioRegistrado> {
    const request = RegistroUsuarioMapper.toRequest(datos);
    const url = `${this.baseUrl}/registro/${ENDPOINT_REGISTRO[datos.rol]}`;
    return this.http.post<UsuarioResponseDto>(url, request).pipe(
      map(RegistroUsuarioMapper.toDomain),
      catchError((error: unknown) => throwError(() => this.toRegistroError(error, request.correo))),
    );
  }

  override iniciarSesion(credenciales: Credenciales): Observable<Sesion> {
    return this.http
      .post<LoginResponseDto>(`${this.baseUrl}/login`, SesionMapper.toRequest(credenciales))
      .pipe(
        map((dto) => SesionMapper.toDomain(dto)),
        catchError((error: unknown) => throwError(() => this.toLoginError(error))),
      );
  }

  override obtenerSesion(): Observable<SesionActiva> {
    return this.http
      .get<SesionResponseDto>(`${this.baseUrl}/sesion`)
      .pipe(map(SesionMapper.toSesionActiva));
  }

  override solicitarRecuperacion(correo: string): Observable<string> {
    const request: SolicitudRecuperacionRequestDto = { correo: correo.trim() };
    return this.http
      .post<MensajeResponseDto>(`${this.baseUrl}/recuperacion/solicitud`, request)
      .pipe(
        map((dto) => dto.mensaje),
        catchError((error: unknown) => throwError(() => this.toSolicitudError(error))),
      );
  }

  override restablecerContrasena(datos: RestablecerContrasena): Observable<string> {
    const request: RestablecerContrasenaRequestDto = {
      token: datos.token.trim(),
      contrasena: datos.contrasena,
      confirmarContrasena: datos.confirmarContrasena,
    };
    return this.http
      .post<MensajeResponseDto>(`${this.baseUrl}/recuperacion/restablecer`, request)
      .pipe(
        map((dto) => dto.mensaje),
        catchError((error: unknown) => throwError(() => this.toRestablecimientoError(error))),
      );
  }

  /** 400 con `errores.correo`: el correo vacío o con formato inválido. */
  private toSolicitudError(error: unknown): unknown {
    if (!(error instanceof ApiError) || error.status !== 400) {
      return error;
    }
    const correo = error.fieldErrors.find(({ field }) => field === 'correo');
    return correo ? new SolicitudRecuperacionInvalidaError({ correo: correo.message }) : error;
  }

  /**
   * 400 con `errores`: validación por campo. 400 sin `errores`: el token no sirve (no existe,
   * venció o ya se usó), siempre con el mismo mensaje.
   */
  private toRestablecimientoError(error: unknown): unknown {
    if (!(error instanceof ApiError) || error.status !== 400) {
      return error;
    }
    if (error.fieldErrors.length === 0) {
      return new EnlaceRecuperacionInvalidoError(error.message);
    }
    const errores: ErroresRestablecimiento = {};
    for (const { field, message } of error.fieldErrors) {
      if ((CAMPOS_RESTABLECIMIENTO as readonly string[]).includes(field)) {
        errores[field as CampoRestablecimiento] = message;
      }
    }
    return Object.keys(errores).length > 0 ? new RestablecimientoInvalidoError(errores) : error;
  }

  /** 401 = credenciales: siempre el mensaje genérico que manda el backend. */
  private toLoginError(error: unknown): unknown {
    return error instanceof ApiError && error.status === 401
      ? new CredencialesInvalidasError(error.message)
      : error;
  }

  private toRegistroError(error: unknown, correo: string): unknown {
    if (!(error instanceof ApiError)) {
      return error;
    }
    if (error.status === 409) {
      return new CorreoYaRegistradoError(correo, error.message);
    }
    if (error.status === 400 && error.fieldErrors.length > 0) {
      const errores: ErroresRegistro = {};
      for (const { field, message } of error.fieldErrors) {
        if ((CAMPOS as readonly string[]).includes(field)) {
          errores[field as CampoRegistroUsuario] = message;
        }
      }
      return new RegistroInvalidoError(errores);
    }
    return error;
  }
}
