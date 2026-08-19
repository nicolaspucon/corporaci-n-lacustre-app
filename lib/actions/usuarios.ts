'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type CrearUsuarioState = {
  error?: string;
  success?: string;
};

function generarPasswordTemporal() {
  // Contraseña temporal legible, el usuario debe cambiarla luego (a futuro).
  const palabras = ['lacustre', 'pucon', 'cannabis', 'arauco', 'volcan', 'trafful'];
  const palabra = palabras[Math.floor(Math.random() * palabras.length)];
  const numero = Math.floor(1000 + Math.random() * 9000);
  return `${palabra}${numero}!`;
}

export async function crearUsuario(
  _prevState: CrearUsuarioState,
  formData: FormData
): Promise<CrearUsuarioState> {
  await requireAdmin();

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const nombre_completo = String(formData.get('nombre_completo') || '').trim();
  const rol = String(formData.get('rol') || '').trim();
  const socio_id = String(formData.get('socio_id') || '').trim();

  if (!email || !nombre_completo || !rol) {
    return { error: 'Correo, nombre y rol son obligatorios.' };
  }

  const rolesValidos = [
    'admin', 'directorio', 'secretaria', 'direccion_tecnica',
    'comite_seguridad', 'comite_calidad', 'comite_etica', 'tesoreria', 'socio',
  ];
  if (!rolesValidos.includes(rol)) {
    return { error: 'Rol no válido.' };
  }
  if (rol === 'socio' && !socio_id) {
    return { error: 'Para el rol "socio" debes seleccionar la ficha de socio a vincular.' };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e: any) {
    return { error: e.message || 'No está configurada la clave de administrador en el servidor.' };
  }

  const password = generarPasswordTemporal();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    return { error: createError?.message || 'No se pudo crear el usuario.' };
  }

  const supabase = createClient();
  const { error: profileError } = await supabase.from('profiles').insert({
    id: created.user.id,
    nombre_completo,
    rol,
    socio_id: rol === 'socio' ? socio_id : null,
  });

  if (profileError) {
    // Si falla la creación del perfil, eliminamos el usuario de auth para no dejarlo huérfano.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: `No se pudo crear el perfil: ${profileError.message}` };
  }

  revalidatePath('/admin/usuarios');
  return {
    success: `Usuario creado. Correo: ${email} — Contraseña temporal: ${password} (guárdala y compártesela de forma segura; pídele que la cambie apenas entre).`,
  };
}
