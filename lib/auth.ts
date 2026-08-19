import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { type Rol, ROL_LABELS } from '@/lib/roles';

export { type Rol, ROL_LABELS };

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

export async function requireAdmin() {
  const profile = await getSessionProfile();
  if (!profile || profile.rol !== 'admin') {
    redirect('/dashboard');
  }
  return profile;
}
