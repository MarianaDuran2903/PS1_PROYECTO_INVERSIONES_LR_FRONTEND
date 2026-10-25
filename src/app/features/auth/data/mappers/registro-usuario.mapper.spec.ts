import { RegistroUsuarioMapper } from './registro-usuario.mapper';

describe('RegistroUsuarioMapper', () => {
  it('normaliza espacios y correo, y convierte opcionales vacíos en null', () => {
    const dto = RegistroUsuarioMapper.toRequest({
      rol: 'ANFITRION',
      primerNombre: '  María   José ',
      segundoNombre: '   ',
      primerApellido: 'Peñaloza',
      correo: '  Maria.Pena@Correo.COM ',
      contrasena: ' Segura#2026 ',
    });

    expect(dto).toEqual({
      rol: 'ANFITRION',
      primerNombre: 'María José',
      segundoNombre: null,
      primerApellido: 'Peñaloza',
      segundoApellido: null,
      correo: 'maria.pena@correo.com',
      contrasena: ' Segura#2026 ',
    });
  });

  it('descarta roles desconocidos de la respuesta', () => {
    const usuario = RegistroUsuarioMapper.toDomain({
      idUsuario: 7,
      primerNombre: 'Ana',
      segundoNombre: null,
      primerApellido: 'Ruiz',
      segundoApellido: null,
      correo: 'ana@correo.com',
      roles: ['HUESPED', 'SUPERUSUARIO'],
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
