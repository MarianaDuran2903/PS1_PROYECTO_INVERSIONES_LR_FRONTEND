export type RolPerfil = 'HUESPED' | 'ANFITRION' | 'ADMINISTRADOR';

export interface Perfil {
  idUsuario: number;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  correo: string;
  rol: RolPerfil;
  cuentaActiva: boolean;
}
