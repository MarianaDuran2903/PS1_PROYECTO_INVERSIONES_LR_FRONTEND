/**
 * Roles del sistema. Un usuario puede tener varios a la vez
 * (herencia {overlapping} de Usuario: Huesped, Anfitrion, Administrador).
 */
export const RolUsuario = {
  Huesped: 'HUESPED',
  Anfitrion: 'ANFITRION',
  Administrador: 'ADMINISTRADOR',
} as const;

export type RolUsuario = (typeof RolUsuario)[keyof typeof RolUsuario];

/**
 * Roles que una persona puede elegir en el registro público. El Administrador
 * no se registra por el formulario: se carga como dato inicial (RF-USR-001).
 */
export type RolRegistrable = typeof RolUsuario.Huesped | typeof RolUsuario.Anfitrion;

export const ROLES_REGISTRABLES: readonly RolRegistrable[] = [
  RolUsuario.Huesped,
  RolUsuario.Anfitrion,
];
