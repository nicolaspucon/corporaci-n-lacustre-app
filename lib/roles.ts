// Tipos y constantes de roles, sin dependencias de servidor (next/headers, etc.)
// para que puedan importarse tanto desde Server Components como desde Client Components.

export type Rol =
  | 'directorio' | 'secretaria' | 'direccion_tecnica'
  | 'comite_seguridad' | 'comite_calidad' | 'comite_etica'
  | 'tesoreria' | 'socio' | 'admin';

export const ROL_LABELS: Record<Rol, string> = {
  admin: 'Administrador/a',
  directorio: 'Directorio',
  secretaria: 'Secretaría',
  direccion_tecnica: 'Dirección Técnica',
  comite_seguridad: 'Comité de Seguridad',
  comite_calidad: 'Comité de Calidad y Trazabilidad',
  comite_etica: 'Comité de Ética y Disciplina',
  tesoreria: 'Tesorería',
  socio: 'Socio',
};
