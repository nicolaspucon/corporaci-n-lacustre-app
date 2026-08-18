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
  };

  const { data, error } = await supabase.from('traslados').insert(payload).select('id').single();
  if (error) {
    redirect('/transporte/nuevo?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/transporte');
  redirect(`/transporte/${data!.id}`);
}

export async function registrarLlegada(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('traslado_id'));
  await supabase.from('traslados').update({ fecha_llegada: new Date().toISOString() }).eq('id', id);
  revalidatePath(`/transporte/${id}`);
  revalidatePath('/transporte');
}
