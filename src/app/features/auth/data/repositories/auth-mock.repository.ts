import { delay, Observable, of, switchMap, throwError, timer } from 'rxjs';
import {
  CredencialesInvalidasError,
  CuentaNoDisponibleError,
} from '../../domain/errors/login.errors';
import { CorreoYaRegistradoError } from '../../domain/errors/registro.errors';
import { RegistroUsuario, UsuarioRegistrado } from '../../domain/models/registro-usuario';
import { RolUsuario } from '../../domain/models/rol-usuario';
import { Credenciales, Sesion } from '../../domain/models/sesion';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { RegistroUsuarioMapper } from '../mappers/registro-usuario.mapper';
import { SesionMapper } from '../mappers/sesion.mapper';

interface CuentaMock {
  idUsuario: number;
  primerNombre: string;
  primerApellido: string;
  correo: string;
  contrasena: string;
  roles: RolUsuario[];
  restringida: boolean;
}

/**
 * Cuentas de demostración, SOLO para desarrollo con `useMockApi: true`.
 * Son datos de prueba del mock; el backend real tendrá su propio usuario administrador inicial.
 */
export const CONTRASENA_DEMO = 'Demo#2026';
/** Huésped ya registrado: también sirve para probar "correo ya registrado". */
export const CORREO_REGISTRADO_DEMO = 'registrado@inversioneslr.com';
export const CORREO_ANFITRION_DEMO = 'anfitrion@inversioneslr.com';
export const CORREO_ADMIN_DEMO = 'admin@inversioneslr.com';
export const CORREO_RESTRINGIDO_DEMO = 'restringido@inversioneslr.com';

const CUENTAS_DEMO: CuentaMock[] = [
  cuenta(1, 'Laura', 'Rojas', CORREO_REGISTRADO_DEMO, [RolUsuario.Huesped]),
  cuenta(2, 'Camilo', 'Vargas', CORREO_ANFITRION_DEMO, [RolUsuario.Anfitrion]),
  cuenta(3, 'Admin', 'Plataforma', CORREO_ADMIN_DEMO, [RolUsuario.Administrador]),
  {
    ...cuenta(4, 'Pedro', 'Silva', CORREO_RESTRINGIDO_DEMO, [RolUsuario.Huesped]),
    restringida: true,
  },
];

function cuenta(
  idUsuario: number,
  primerNombre: string,
  primerApellido: string,
  correo: string,
  roles: RolUsuario[],
): CuentaMock {
  return {
    idUsuario,
    primerNombre,
    primerApellido,
    correo,
    contrasena: CONTRASENA_DEMO,
    roles,
    restringida: false,
  };
}

/**
 * Implementación en memoria para desarrollar sin backend (`useMockApi: true`).
 * Los datos se pierden al recargar la página. Se instancia con `new` desde `provideAuthData`.
 */
export class AuthMockRepository extends AuthRepository {
  private readonly cuentas = new Map<string, CuentaMock>(
    CUENTAS_DEMO.map((c) => [c.correo, { ...c }]),
  );
  private siguienteId = CUENTAS_DEMO.length + 1;

  constructor(private readonly latenciaMs = 600) {
    super();
  }

  override registrarUsuario(datos: RegistroUsuario): Observable<UsuarioRegistrado> {
    const request = RegistroUsuarioMapper.toRequest(datos);

    if (this.cuentas.has(request.correo)) {
      return this.fallar(new CorreoYaRegistradoError(request.correo));
    }

    const nueva: CuentaMock = {
      idUsuario: this.siguienteId++,
      primerNombre: request.primerNombre,
      primerApellido: request.primerApellido,
      correo: request.correo,
      contrasena: request.contrasena,
      roles: [datos.rol],
      restringida: false,
    };
    this.cuentas.set(nueva.correo, nueva);

    return of<UsuarioRegistrado>({
      idUsuario: nueva.idUsuario,
      primerNombre: nueva.primerNombre,
      primerApellido: nueva.primerApellido,
      correo: nueva.correo,
      roles: nueva.roles,
    }).pipe(delay(this.latenciaMs));
  }

  override iniciarSesion(credenciales: Credenciales): Observable<Sesion> {
    const request = SesionMapper.toRequest(credenciales);
    const encontrada = this.cuentas.get(request.correo);

    if (!encontrada || encontrada.contrasena !== request.contrasena) {
      return this.fallar(new CredencialesInvalidasError());
    }
    if (encontrada.restringida) {
      return this.fallar(new CuentaNoDisponibleError('RESTRINGIDA'));
    }

    return of<Sesion>({
      accessToken: `mock-token-${encontrada.idUsuario}`,
      usuario: {
        idUsuario: encontrada.idUsuario,
        primerNombre: encontrada.primerNombre,
        primerApellido: encontrada.primerApellido,
        correo: encontrada.correo,
        roles: encontrada.roles,
      },
    }).pipe(delay(this.latenciaMs));
  }

  /** `delay` no retrasa errores; `timer` simula la latencia también en este caso. */
  private fallar(error: Error): Observable<never> {
    return timer(this.latenciaMs).pipe(switchMap(() => throwError(() => error)));
  }
}
