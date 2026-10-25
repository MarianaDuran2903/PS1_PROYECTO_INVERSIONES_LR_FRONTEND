import { Observable } from 'rxjs';
import { RegistroUsuario, UsuarioRegistrado } from '../models/registro-usuario';
import { Credenciales, Sesion } from '../models/sesion';

/**
 * Puerto (Repository) de autenticación. La capa de aplicación depende de esta
 * abstracción; las implementaciones concretas (HTTP o en memoria) viven en `data/`.
 *
 * Errores esperados:
 * - registrarUsuario: `CorreoYaRegistradoError`, `RegistroInvalidoError`
 * - iniciarSesion: `CredencialesInvalidasError`, `CuentaNoDisponibleError`
 * - cualquier otro fallo llega como `ApiError`.
 */
export abstract class AuthRepository {
  abstract registrarUsuario(datos: RegistroUsuario): Observable<UsuarioRegistrado>;
  abstract iniciarSesion(credenciales: Credenciales): Observable<Sesion>;
}
