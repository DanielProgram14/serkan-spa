export const ROLES = {
  ADMIN: 'ADMINISTRADOR',
  RRHH: 'RRHH',
  SUPERVISOR: 'SUPERVISOR',
  TRABAJADOR: 'TRABAJADOR'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];