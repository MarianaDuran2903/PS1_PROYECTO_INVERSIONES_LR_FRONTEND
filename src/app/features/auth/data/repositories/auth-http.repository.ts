import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { catchError, map, Observable, throwError } from 'rxjs';
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
import {
  CredencialesInvalidasError,
  CuentaNoDisponibleError,
} from '../../domain/errors/login.errors';
import { Credenciales, Sesion } from '../../domain/models/sesion';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { UsuarioResponseDto } from '../dtos/registro-usuario.dto';
import { LoginResponseDto } from '../dtos/sesion.dto';
import { RegistroUsuarioMapper } from '../mappers/registro-usuario.mapper';
import { SesionMapper } from '../mappers/sesion.mapper';

const CAMPOS: readonly CampoRegistroUsuario[] = [
  'rol',
  'primerNombre',
  'segundoNombre',
  'primerApellido',
  'segundoApellido',
  'correo',
  'contrasena',
];

/** Implementación del puerto AuthRepository contra el API REST del backend. */
@Injectable()
export class AuthHttpRepository extends AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_CONFIG).apiUrl}/auth`;

  override registrarUsuario(datos: RegistroUsuario): Observable<UsuarioRegistrado> {
    const request = RegistroUsuarioMapper.toRequest(datos);
    return this.http.post<UsuarioResponseDto>(`${this.baseUrl}/registro`, request).pipe(
      map(RegistroUsuarioMapper.toDomain),
      catchError((error: unknown) => throwError(() => this.toDomainError(error, request.correo))),
    );
  }

  override iniciarSesion(credenciales: Credenciales): Observable<Sesion> {
    return this.http
      .post<LoginResponseDto>(`${this.baseUrl}/login`, SesionMapper.toRequest(credenciales))
      .pipe(
        map(SesionMapper.toDomain),
        catchError((error: unknown) => throwError(() => this.toLoginError(error))),
      );
  }

  /** 401 = credenciales; 403 con código = cuenta inactiva o restringida. */
  private toLoginError(error: unknown): unknown {
    if (!(error instanceof ApiError)) {
      return error;
    }
    if (error.status === 401) {
      return new CredencialesInvalidasError();
    }
    if (error.status === 403 && error.code === 'ACCOUNT_RESTRICTED') {
      return new CuentaNoDisponibleError('RESTRINGIDA');
    }
    if (error.status === 403 && error.code === 'ACCOUNT_INACTIVE') {
      return new CuentaNoDisponibleError('INACTIVA');
    }
    return error;
  }

  private toDomainError(error: unknown, correo: string): unknown {
    if (!(error instanceof ApiError)) {
      return error;
    }
    if (error.status === 409) {
      return new CorreoYaRegistradoError(correo);
    }
    if ((error.status === 400 || error.status === 422) && error.fieldErrors.length > 0) {
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
