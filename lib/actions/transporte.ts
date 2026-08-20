'use server';

import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return v === null || v === '' ? null : String(v);
}

export async function crearTraslado(formData: FormData) {
  const supabase = createClient();
  const profile = await getSessionProfile();

  const payload = {
    tipo: str(formData, 'tipo') ?? 'interno',
    fecha_salida: str(formData, 'fecha_salida'),
    fecha_llegada: str(formData, 'fecha_llegada'),
    origen: str(formData, 'origen'),
    destino: str(formData, 'destino'),
    responsable: profile?.id ?? null,
    vehiculo_patente: str(formData, 'vehiculo_patente'),
    lote_id: str(formData, 'lote_id'),
    entrega_id: str(formData, 'entrega_id'),
    cantidad: str(formData, 'cantidad'),
    autorizacion: str(formData, 'autorizacion'),
    observaciones: str(formData, 'observaciones'),
    estado: 'en_curso',
  };

  const { data, error } = await supabase.from('traslados').insert(payload).select('id').single();
  if (error) {
    redirect('/transporte/nuevo?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/transporte');
  redirect(`/transporte/${data!.id}`);
}

// Al registrar la llegada, se cierra el ciclo del traslado (estado
// 'completado') y, si el traslado está vinculado a una entrega, esa entrega
// queda marcada como trasladada — así el expediente de la entrega refleja
// automáticamente que el producto efectivamente llegó a destino.
export async function registrarLlegada(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('traslado_id'));

  const { data: traslado } = await supabase.from('traslados').select('entrega_id').eq('id', id).maybeSingle();

  await supabase
    .from('traslados')
    .update({ fecha_llegada: new Date().toISOString(), estado: 'completado' })
    .eq('id', id);

  if (traslado?.entrega_id) {
    await supabase.from('entregas').update({ trasladado: true }).eq('id', traslado.entrega_id);
    revalidatePath(`/suministracion/entregas/${traslado.entrega_id}`);
    revalidatePath('/suministracion/entregas');
  }

  revalidatePath(`/transporte/${id}`);
  revalidatePath('/transporte');
}
