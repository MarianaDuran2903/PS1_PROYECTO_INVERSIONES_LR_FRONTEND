import { Observable } from 'rxjs';
import { RestablecerContrasena } from '../models/recuperacion';
import { RegistroUsuario, UsuarioRegistrado } from '../models/registro-usuario';
import { Credenciales, Sesion, SesionActiva } from '../models/sesion';

/**
 * Puerto (Repository) de autenticación. La capa de aplicación depende de esta
 * abstracción; la implementación concreta (HTTP) vive en `data/`.
 *
 * Errores esperados:
 * - registrarUsuario: `CorreoYaRegistradoError`, `RegistroInvalidoError`
 * - iniciarSesion: `CredencialesInvalidasError`
 * - solicitarRecuperacion: `SolicitudRecuperacionInvalidaError`
 * - restablecerContrasena: `RestablecimientoInvalidoError`, `EnlaceRecuperacionInvalidoError`
 * - reactivarCuenta: `CredencialesInvalidasError`, `ApiError`
 * - cualquier otro fallo llega como `ApiError`.
 */
export abstract class AuthRepository {
  abstract registrarUsuario(datos: RegistroUsuario): Observable<UsuarioRegistrado>;
  abstract iniciarSesion(credenciales: Credenciales): Observable<Sesion>;
  abstract reactivarCuenta(credenciales: Credenciales): Observable<Sesion>;
  abstract obtenerSesion(): Observable<SesionActiva>;
  /** Devuelve el mensaje neutral del backend: es el mismo exista o no el correo. */
  abstract solicitarRecuperacion(correo: string): Observable<string>;
  /** Devuelve el mensaje de éxito del backend. */
  abstract restablecerContrasena(datos: RestablecerContrasena): Observable<string>;
}
