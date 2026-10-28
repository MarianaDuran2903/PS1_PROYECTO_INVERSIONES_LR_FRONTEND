import { SesionMapper } from './sesion.mapper';
import { RegistroUsuarioMapper } from './registro-usuario.mapper';

describe('RegistroUsuarioMapper', () => {
  it('recorta los espacios, convierte opcionales vacíos en null y no envía el rol', () => {
    const dto = RegistroUsuarioMapper.toRequest({
      rol: 'ANFITRION',
      primerNombre: '  María José ',
      segundoNombre: '   ',
      primerApellido: 'Peñaloza',
      correo: '  maria.pena@correo.com ',
      contrasena: 'Segura#2026',
      confirmarContrasena: 'Segura#2026',
    });

    expect(dto).toEqual({
      primerNombre: 'María José',
      segundoNombre: null,
      primerApellido: 'Peñaloza',
      segundoApellido: null,
      correo: 'maria.pena@correo.com',
      contrasena: 'Segura#2026',
      confirmarContrasena: 'Segura#2026',
    });
    expect('rol' in dto).toBeFalse();
  });

  it('no recorta las contraseñas: el backend decide si son válidas', () => {
    const dto = RegistroUsuarioMapper.toRequest({
      rol: 'HUESPED',
      primerNombre: 'Ana',
      primerApellido: 'Ruiz',
      correo: 'ana@correo.com',
      contrasena: ' Segura#2026 ',
      confirmarContrasena: ' Segura#2026 ',
    });

    expect(dto.contrasena).toBe(' Segura#2026 ');
  });

  it('convierte la respuesta con un solo rol en el modelo de dominio', () => {
    const usuario = RegistroUsuarioMapper.toDomain({
      idUsuario: 7,
      primerNombre: 'Ana',
      segundoNombre: null,
      primerApellido: 'Ruiz',
      segundoApellido: null,
      correo: 'ana@correo.com',
      rol: 'HUESPED',
      cuentaActiva: true,
    });

    expect(usuario).toEqual({
      idUsuario: 7,
      primerNombre: 'Ana',
      primerApellido: 'Ruiz',
      correo: 'ana@correo.com',
      roles: ['HUESPED'],
    });
  });
});

describe('SesionMapper', () => {
  const usuario = {
    idUsuario: 7,
    primerNombre: 'Ana',
    segundoNombre: null,
    primerApellido: 'Ruiz',
    segundoApellido: null,
    correo: 'ana@correo.com',
    rol: 'ANFITRION' as const,
    cuentaActiva: true,
  };

  it('calcula el vencimiento como ahora + expiraEn segundos', () => {
    const sesion = SesionMapper.toDomain(
      { token: 'jwt', tipo: 'Bearer', expiraEn: 3600, usuario },
      1_000_000,
    );

    expect(sesion.accessToken).toBe('jwt');
    expect(sesion.expiraEn).toBe(1_000_000 + 3_600_000);
    expect(sesion.usuario.roles).toEqual(['ANFITRION']);
  });

  it('interpreta el vencimiento ISO-8601 de la sesión activa', () => {
    const activa = SesionMapper.toSesionActiva({ usuario, expiraEn: '2026-05-01T10:00:00Z' });

    expect(activa.expiraEn).toBe(Date.parse('2026-05-01T10:00:00Z'));
    expect(activa.usuario.idUsuario).toBe(7);
  });

  it('recorta el correo del login y no toca la contraseña', () => {
    expect(SesionMapper.toRequest({ correo: ' ana@correo.com ', contrasena: ' x ' })).toEqual({
      correo: 'ana@correo.com',
      contrasena: ' x ',
    });
  });
});
