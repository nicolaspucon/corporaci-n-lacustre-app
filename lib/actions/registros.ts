'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getEntity, getResponsableColumn } from '@/lib/entities';
import { saldoActualLote } from '@/lib/inventario';
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
    if (field.faseFinal) continue;

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

  // Manejo fitosanitario marcado "¿Registrado como incidente?" -> crea el incidente solo.
  if (entity.slug === 'fitosanitario' && payload['registrado_como_incidente'] === true) {
    await supabase.from('incidentes').insert({
      fecha_hora: new Date().toISOString(),
      tipo: 'Fitosanitario',
      descripcion: `Generado automáticamente desde Manejo Fitosanitario (${payload['fecha'] ?? ''}). Problema: ${payload['problema'] ?? '—'}. Acción: ${payload['accion'] ?? '—'}. Producto: ${payload['producto'] ?? '—'}.`,
      estado: 'abierto',
      responsable_reporte: user?.id ?? null,
    });
  }

  revalidatePath(`/registros/${slug}`);
  if (entity.slug === 'fitosanitario' && payload['registrado_como_incidente'] === true) {
    revalidatePath('/registros/incidentes');
  }
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

export async function actualizarRegistro(formData: FormData) {
  const slug = String(formData.get('__slug') || '');
  const id = String(formData.get('__id') || '');
  const entity = getEntity(slug);
  if (!entity || !id) {
    redirect(`/registros/${slug}`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload: Record<string, unknown> = {};

  for (const field of entity!.fields) {
    if (!field.faseFinal) continue;

    if (field.type === 'photo') {
      const file = formData.get(field.key);
      if (file instanceof File && file.size > 0) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `registros/${entity!.table}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('documentos').upload(path, file);
        if (uploadError) {
          redirect(`/registros/${slug}/${id}?error=${encodeURIComponent('No se pudo subir la fotografía: ' + uploadError.message)}`);
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

  if (Object.keys(payload).length === 0) {
    redirect(`/registros/${slug}/${id}`);
  }

  const { error } = await supabase.from(entity!.table).update(payload).eq('id', id);

  if (error) {
    redirect(`/registros/${slug}/${id}?error=${encodeURIComponent(error.message)}`);
  }

  // Al terminar el Curado con un peso final, el producto queda disponible:
  // genera solo una "entrada" en el Registro de Inventario (una sola vez por
  // registro, gracias a origen_curado_id).
  if (entity!.slug === 'curado' && typeof payload['peso_final_g'] === 'number' && payload['peso_final_g']! > 0) {
    const { data: yaExiste } = await supabase
      .from('registros_inventario')
      .select('id')
      .eq('origen_curado_id', id)
      .limit(1);

    if (!yaExiste || yaExiste.length === 0) {
      const { data: curadoReg } = await supabase
        .from('registros_curado')
        .select('lote_id, lote:lotes(codigo, cultivo_genetica)')
        .eq('id', id)
        .maybeSingle();
      const loteId = (curadoReg as any)?.lote_id ?? null;
      const lote = (curadoReg as any)?.lote;

      await supabase.from('registros_inventario').insert({
        fecha: new Date().toISOString().slice(0, 10),
        codigo: lote?.codigo ?? null,
        lote_id: loteId,
        tipo_movimiento: 'entrada',
        cantidad_g: payload['peso_final_g'],
        origen_curado_id: id,
        documento_respaldo: lote?.codigo ? `Curado ${lote.codigo}` : 'Curado finalizado',
        observaciones: `Entrada automática: curado finalizado${lote?.cultivo_genetica ? ' — ' + lote.cultivo_genetica : ''}.`,
        responsable: user?.id ?? null,
        saldo_resultante_g: loteId ? (await saldoActualLote(supabase, loteId)) + Number(payload['peso_final_g']) : null,
      });
      revalidatePath('/registros/inventario');
    }
  }

  revalidatePath(`/registros/${slug}`);
  revalidatePath(`/registros/${slug}/${id}`);
  redirect(`/registros/${slug}/${id}`);
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
