'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return v === null || v === '' ? null : String(v);
}
function num(formData: FormData, key: string) {
  const v = formData.get(key);
  return v === null || v === '' ? null : Number(v);
}

export async function crearLote(formData: FormData) {
  const supabase = createClient();

  const fecha_inicio = str(formData, 'fecha_inicio');
  if (!fecha_inicio) {
    redirect('/agricola/lotes/nuevo?error=' + encodeURIComponent('La fecha de inicio es obligatoria.'));
  }

  const payload = {
    fecha_inicio,
    area_m2: num(formData, 'area_m2'),
    cultivo_genetica: str(formData, 'cultivo_genetica'),
    n_plantas: num(formData, 'n_plantas'),
    sem_germinacion: num(formData, 'sem_germinacion') ?? 2,
    sem_vegetacion: num(formData, 'sem_vegetacion') ?? 5,
    sem_floracion: num(formData, 'sem_floracion') ?? 11,
    sem_cosecha: num(formData, 'sem_cosecha') ?? 1,
    rendimiento_esperado_m2: num(formData, 'rendimiento_esperado_m2'),
    rendimiento_esperado_planta: num(formData, 'rendimiento_esperado_planta'),
  };

  const { data, error } = await supabase.from('lotes').insert(payload).select('id').single();
  if (error) {
    redirect('/agricola/lotes/nuevo?error=' + encodeURIComponent(error.message));
  }

  // Genera automáticamente una ficha de planta (CP-) por cada planta indicada en el
  // lote, ya que esa cantidad es la información que se necesita para crearlas.
  if (payload.n_plantas && payload.n_plantas > 0) {
    const nuevasPlantas = Array.from({ length: payload.n_plantas }, () => ({
      lote_id: data!.id,
      fecha_germinacion: fecha_inicio,
      estado_sanitario: 'sano',
    }));
    await supabase.from('plantas').insert(nuevasPlantas);
  }

  revalidatePath('/agricola/lotes');
  revalidatePath('/agricola/plantas');
  revalidatePath('/agricola/planificacion');
  redirect(`/agricola/lotes/${data!.id}${payload.n_plantas ? '?plantas_creadas=' + payload.n_plantas : ''}`);
}

export async function actualizarEstadoLote(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('lote_id'));
  const estado = String(formData.get('estado'));
  const patch: Record<string, unknown> = { estado };
  if (estado === 'cerrado') {
    patch.fecha_cierre = new Date().toISOString().slice(0, 10);
    const evaluacion = str(formData, 'evaluacion_final');
    if (evaluacion) patch.evaluacion_final = evaluacion;
  }
  await supabase.from('lotes').update(patch).eq('id', id);
  revalidatePath(`/agricola/lotes/${id}`);
  revalidatePath('/agricola/lotes');
  revalidatePath('/agricola/planificacion');
}

export async function crearPlanta(formData: FormData) {
  const supabase = createClient();

  const payload = {
    lote_id: str(formData, 'lote_id'),
    fecha_germinacion: str(formData, 'fecha_germinacion'),
    origen: str(formData, 'origen'),
    variedad: str(formData, 'variedad'),
    estado_sanitario: str(formData, 'estado_sanitario') ?? 'sano',
    ubicacion: str(formData, 'ubicacion'),
    observaciones: str(formData, 'observaciones'),
  };

  const { data, error } = await supabase.from('plantas').insert(payload).select('id').single();
  if (error) {
    redirect('/agricola/plantas/nuevo?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/agricola/plantas');
  redirect(`/agricola/plantas/${data!.id}`);
}

export async function actualizarPlanta(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('planta_id'));
  const patch = {
    estado_sanitario: str(formData, 'estado_sanitario'),
    ubicacion: str(formData, 'ubicacion'),
    observaciones: str(formData, 'observaciones'),
    fecha_cosecha: str(formData, 'fecha_cosecha'),
  };
  await supabase.from('plantas').update(patch).eq('id', id);
  revalidatePath(`/agricola/plantas/${id}`);
  revalidatePath('/agricola/plantas');
}
