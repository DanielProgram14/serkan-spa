export type Rol = 'ADMINISTRADOR' | 'RRHH' | 'SUPERVISOR' | 'TRABAJADOR';

export interface Usuario {
  email: string;
  rol: Rol;
  trabajador_rut?: string;
}

export interface Trabajador {
  rut: string;
  nombres: string;
  apellidos: string;
  area: string;
  cargo: string;
  estado: string;
  fecha_ingreso: string;
  telefono?: string;
  correo_personal?: string;
  correo_empresarial?: string;
}

export interface Tarea {
  id: number;
  nombre: string;
  fecha_limite: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
}
