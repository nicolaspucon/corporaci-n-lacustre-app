'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getEntity } from '@/lib/entities';
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

  if (entity.responsableColumn) {
    payload[entity.responsableColumn] = user?.id ?? null;
  }

  const { error } = await supabase.from(entity.table).insert(payload);

  if (error) {
    redirect(`/registros/${slug}/nuevo?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/registros/${slug}`);
  redirect(`/registros/${slug}`);
}
