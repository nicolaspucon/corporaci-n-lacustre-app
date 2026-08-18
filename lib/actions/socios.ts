'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createSocio(formData: FormData) {
  const supabase = createClient();

  const payload = {
    nombre_completo: String(formData.get('nombre_completo') || ''),
    rut: String(formData.get('rut') || '') || null,
    fecha_nacimiento: String(formData.get('fecha_nacimiento') || '') || null,
    direccion: String(formData.get('direccion') || '') || null,
    telefono: String(formData.get('telefono') || '') || null,
    email: String(formData.get('email') || '') || null,
    categoria: String(formData.get('categoria') || 'activo'),
  };

  if (!payload.nombre_completo) {
    redirect('/socios/nuevo?error=' + encodeURIComponent('El nombre completo es obligatorio.'));
  }

  const { data, error } = await supabase.from('socios').insert(payload).select('id').single();

  if (error) {
    redirect('/socios/nuevo?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/socios');
  redirect(`/socios/${data!.id}`);
}

export async function actualizarEstadoSocio(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('socio_id'));
  const estado = String(formData.get('estado'));
  await supabase.from('socios').update({ estado, fecha_ultima_actualizacion: new Date().toISOString().slice(0, 10) }).eq('id', id);
  revalidatePath(`/socios/${id}`);
}

export async function guardarFichaPerfil(formData: FormData) {
  const supabase = createClient();
  const socioId = String(formData.get('socio_id'));

  const payload: Record<string, unknown> = {
    socio_id: socioId,
    diagnostico_principal: str(formData, 'diagnostico_principal'),
    medico_tratante: str(formData, 'medico_tratante'),
    especialidad: str(formData, 'especialidad'),
    fecha_receta: str(formData, 'fecha_receta'),
    vigencia_receta: str(formData, 'vigencia_receta'),
    duracion_tratamiento: str(formData, 'duracion_tratamiento'),
    via_administracion: str(formData, 'via_administracion'),
    dosis_diaria_g: num(formData, 'dosis_diaria_g'),
    frecuencia_diaria: num(formData, 'frecuencia_diaria'),
    consumo_mensual_estimado_g: num(formData, 'consumo_mensual_estimado_g'),
    rango_minimo_g: num(formData, 'rango_minimo_g'),
    rango_maximo_g: num(formData, 'rango_maximo_g'),
    variedad_genetica: str(formData, 'variedad_genetica'),
    n_plantas_asignadas: num(formData, 'n_plantas_asignadas'),
    codigos_planta: str(formData, 'codigos_planta'),
    observaciones_tecnicas: str(formData, 'observaciones_tecnicas'),
  };

  const { data: existing } = await supabase.from('fichas_perfil').select('id').eq('socio_id', socioId).maybeSingle();

  if (existing) {
    await supabase.from('fichas_perfil').update(payload).eq('id', existing.id);
  } else {
    await supabase.from('fichas_perfil').insert(payload);
  }

  revalidatePath(`/socios/${socioId}`);
}

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return v === null || v === '' ? null : String(v);
}
function num(formData: FormData, key: string) {
  const v = formData.get(key);
  return v === null || v === '' ? null : Number(v);
}
