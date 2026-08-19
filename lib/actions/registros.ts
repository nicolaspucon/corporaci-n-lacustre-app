'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getEntity, getResponsableColumn } from '@/lib/entities';
import { revalidatePath } from 'next/cache';

export async function createRegistro(formData: FormData) {
  const slug = String(formData.get('__slug') || '');
  const entity = getEntity(slug);
  if (!entity) throw new Error(`Entidad desconocida: ${slug}`);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload: Record<string, unknown> = {};

  for (const field of entity.fields) {
    if (field.type === 'photo') {
      const file = formData.get(field.key);
      if (file instanceof File && file.size > 0) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `registros/${entity.table}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('documentos').upload(path, file);
        if (uploadError) {
          redirect(`/registros/${slug}/nuevo?error=${encodeURIComponent('No se pudo subir la fotografía: ' + uploadError.message)}`);
        }
        payload[`${field.key}_path`] = path;
      }
      continue;
    }

    const raw = formData.get(field.key);
    const col = field.type === 'lote' || field.type === 'planta' ? `${field.key}_id` : field.key;

    if (field.type === 'boolean') {
      payload[col] = raw === 'on';
      continue;
    }
    if (raw === null || raw === '') {
      payload[col] = null;
      continue;
    }
    payload[col] = field.type === 'number' ? Number(raw) : String(raw);
  }

  const responsableCol = getResponsableColumn(entity);
  if (responsableCol) {
    payload[responsableCol] = user?.id ?? null;
  }

  const { data: created, error } = await supabase.from(entity.table).insert(payload).select('id').single();

  if (error) {
    redirect(`/registros/${slug}/nuevo?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/registros/${slug}`);
  redirect(`/registros/${slug}/${created!.id}`);
}

export async function eliminarRegistro(formData: FormData) {
  const slug = String(formData.get('__slug') || '');
  const id = String(formData.get('id') || '');
  const entity = getEntity(slug);
  if (!entity || !id) {
    redirect(`/registros/${slug}`);
  }

  const supabase = createClient();
  const { error } = await supabase.from(entity!.table).delete().eq('id', id);

  if (error) {
    redirect(`/registros/${slug}/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/registros/${slug}`);
  redirect(`/registros/${slug}`);
}


export async function confirmarIngreso(formData: FormData) {
  const returnTo = String(formData.get('__return') || '/dashboard');
  const motivo = String(formData.get('motivo') || '');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: prof } = await supabase.from('profiles').select('nombre_completo').eq('id', user.id).single();
    const now = new Date();
    await supabase.from('registro_ingreso_visitas').insert({
      nombre: prof?.nombre_completo ?? 'Equipo técnico',
      motivo,
      fecha: now.toISOString().slice(0, 10),
      hora_ingreso: now.toTimeString().slice(0, 5),
      autorizado_por: user.id,
    });
  }

  revalidatePath(returnTo);
  redirect(returnTo);
}
