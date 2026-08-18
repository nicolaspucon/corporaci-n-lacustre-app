'use server';

import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
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

export async function crearSolicitud(formData: FormData) {
  const supabase = createClient();
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');

  const socioIdForm = str(formData, 'socio_id');
  const socioId = profile.rol === 'socio' ? profile.socio_id : socioIdForm;

  if (!socioId) {
    redirect('/suministracion/solicitudes/nuevo?error=' + encodeURIComponent('Debes indicar el socio solicitante.'));
  }

  const payload = {
    socio_id: socioId,
    fecha: str(formData, 'fecha') ?? new Date().toISOString().slice(0, 10),
    tipo_material: str(formData, 'tipo_material'),
    cantidad_solicitada_g: num(formData, 'cantidad_solicitada_g'),
    observaciones: str(formData, 'observaciones'),
  };

  const { error } = await supabase.from('solicitudes_suministro').insert(payload);
  if (error) {
    redirect('/suministracion/solicitudes/nuevo?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/suministracion/solicitudes');
  redirect('/suministracion/solicitudes');
}

export async function resolverSolicitud(formData: FormData) {
  const supabase = createClient();
  const profile = await getSessionProfile();
  const id = String(formData.get('solicitud_id'));
  const resolucion = String(formData.get('resolucion'));

  await supabase
    .from('solicitudes_suministro')
    .update({ resolucion, resuelto_por: profile?.id ?? null })
    .eq('id', id);

  revalidatePath('/suministracion/solicitudes');
  revalidatePath(`/suministracion/solicitudes/${id}`);
}

export async function crearEntrega(formData: FormData) {
  const supabase = createClient();
  const profile = await getSessionProfile();

  const socioId = str(formData, 'socio_id');
  if (!socioId) {
    redirect('/suministracion/entregas/nuevo?error=' + encodeURIComponent('Debes indicar el socio.'));
  }

  const payload = {
    socio_id: socioId,
    lote_id: str(formData, 'lote_id'),
    cantidad_g: num(formData, 'cantidad_g'),
    responsable_entrega: profile?.id ?? null,
    solicitud_id: str(formData, 'solicitud_id'),
    observaciones: str(formData, 'observaciones'),
  };

  const { data, error } = await supabase.from('entregas').insert(payload).select('id').single();
  if (error) {
    redirect('/suministracion/entregas/nuevo?error=' + encodeURIComponent(error.message));
  }

  const solicitudId = str(formData, 'solicitud_id');
  if (solicitudId) {
    await supabase.from('solicitudes_suministro').update({ resolucion: 'aprobada' }).eq('id', solicitudId);
  }

  revalidatePath('/suministracion/entregas');
  redirect(`/suministracion/entregas/${data!.id}`);
}
