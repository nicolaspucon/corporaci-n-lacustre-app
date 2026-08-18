import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type Rol =
  | 'directorio' | 'secretaria' | 'direccion_tecnica'
  | 'comite_seguridad' | 'comite_calidad' | 'comite_etica'
  | 'tesoreria' | 'socio' | 'admin';

export async function getSessionProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return profile;
}

export async function requireStaff() {
  const profile = await getSessionProfile();
  const staffRoles: Rol[] = ['admin', 'directorio', 'secretaria', 'direccion_tecnica'];
  if (!profile || !staffRoles.includes(profile.rol)) {
    redirect('/dashboard');
  }
  return profile;
}

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
