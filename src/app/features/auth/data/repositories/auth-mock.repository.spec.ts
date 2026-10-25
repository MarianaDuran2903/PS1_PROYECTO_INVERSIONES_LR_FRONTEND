import { fakeAsync, tick } from '@angular/core/testing';
import {
  CredencialesInvalidasError,
  CuentaNoDisponibleError,
} from '../../domain/errors/login.errors';
import { CorreoYaRegistradoError } from '../../domain/errors/registro.errors';
import { RegistroUsuario } from '../../domain/models/registro-usuario';
import { Sesion } from '../../domain/models/sesion';
import {
  AuthMockRepository,
  CONTRASENA_DEMO,
  CORREO_ANFITRION_DEMO,
  CORREO_REGISTRADO_DEMO,
  CORREO_RESTRINGIDO_DEMO,
} from './auth-mock.repository';

describe('AuthMockRepository', () => {
  const datos: Omit<RegistroUsuario, 'correo'> = {
    rol: 'HUESPED',
    primerNombre: 'Ana',
    primerApellido: 'Ruiz',
    contrasena: 'Segura#2026',
  };

  it('crea la cuenta con el rol elegido y luego rechaza el mismo correo', fakeAsync(() => {
    const repository = new AuthMockRepository(10);
    const roles: string[][] = [];
    let error: unknown;

    repository
      .registrarUsuario({ ...datos, correo: 'ana@correo.com' })
      .subscribe((u) => roles.push(u.roles));
    tick(10);
    repository
      .registrarUsuario({ ...datos, rol: 'ANFITRION', correo: 'luis@correo.com' })
      .subscribe((u) => roles.push(u.roles));
    tick(10);
    repository
      .registrarUsuario({ ...datos, correo: 'ANA@correo.com' })
      .subscribe({ error: (e: unknown) => (error = e) });
    tick(10);

    expect(roles).toEqual([['HUESPED'], ['ANFITRION']]);
    expect(error).toBeInstanceOf(CorreoYaRegistradoError);
  }));

  it('trae precargado un correo para la demo de duplicados', fakeAsync(() => {
    let error: unknown;
    new AuthMockRepository(0)
      .registrarUsuario({ ...datos, correo: CORREO_REGISTRADO_DEMO })
      .subscribe({ error: (e: unknown) => (error = e) });
    tick();

    expect(error).toBeInstanceOf(CorreoYaRegistradoError);
  }));

  describe('iniciarSesion', () => {
    const iniciar = (repository: AuthMockRepository, correo: string, contrasena: string) => {
      const resultado: { sesion?: Sesion; error?: unknown } = {};
      repository.iniciarSesion({ correo, contrasena }).subscribe({
        next: (s) => (resultado.sesion = s),
        error: (e: unknown) => (resultado.error = e),
      });
      tick(10);
      return resultado;
    };

    it('abre sesión con las cuentas de demostración, con su rol y un token', fakeAsync(() => {
      const repository = new AuthMockRepository(10);

      const anfitrion = iniciar(repository, CORREO_ANFITRION_DEMO, CONTRASENA_DEMO);
      const admin = iniciar(repository, 'ADMIN@inversioneslr.com', CONTRASENA_DEMO);

      expect(anfitrion.sesion?.usuario.roles).toEqual(['ANFITRION']);
      expect(anfitrion.sesion?.accessToken).toBeTruthy();
      expect(admin.sesion?.usuario.roles).toEqual(['ADMINISTRADOR']);
    }));

    it('rechaza contraseña incorrecta y correo desconocido con el mismo error', fakeAsync(() => {
      const repository = new AuthMockRepository(10);

      const mala = iniciar(repository, CORREO_ANFITRION_DEMO, 'otra');
      const desconocida = iniciar(repository, 'nadie@correo.com', CONTRASENA_DEMO);

      expect(mala.error).toBeInstanceOf(CredencialesInvalidasError);
      expect(desconocida.error).toBeInstanceOf(CredencialesInvalidasError);
    }));

    it('no deja entrar a una cuenta restringida', fakeAsync(() => {
      const resultado = iniciar(
        new AuthMockRepository(10),
        CORREO_RESTRINGIDO_DEMO,
        CONTRASENA_DEMO,
      );

      expect(resultado.error).toBeInstanceOf(CuentaNoDisponibleError);
      expect((resultado.error as CuentaNoDisponibleError).motivo).toBe('RESTRINGIDA');
    }));

    it('una cuenta recién registrada puede iniciar sesión con su contraseña', fakeAsync(() => {
      const repository = new AuthMockRepository(10);
      repository
        .registrarUsuario({ ...datos, rol: 'ANFITRION', correo: 'Nueva@Correo.com' })
        .subscribe();
      tick(10);

      const resultado = iniciar(repository, 'nueva@correo.com', 'Segura#2026');

      expect(resultado.sesion?.usuario.roles).toEqual(['ANFITRION']);
    }));
  });
});
