'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/auth';

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase
    .from('socios')
    .update({
      estado,
      fecha_ultima_actualizacion: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq('id', id);
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
    numero_receta: str(formData, 'numero_receta'),
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


// Anula la ficha del socio en vez de eliminarla: queda oculta de la lista
// normal, pero se conserva con fecha, quién la anuló y el motivo. Para un
// socio que renunció o fue excluido pero cuya membresía sí fue real, sigue
// siendo más correcto cambiar su estado a "Renunciado"/"Excluido"; anular es
// para corregir un error de ingreso (ficha duplicada, creada por error, etc.).
export async function anularSocio(formData: FormData) {
  await requireStaff();
  const supabase = createClient();
  const id = String(formData.get('id') || '');
  const motivo = String(formData.get('motivo') || '').trim();

  if (!id) {
    redirect('/socios?error=' + encodeURIComponent('Falta el identificador del socio.'));
  }
  if (!motivo) {
    redirect(`/socios/${id}?error=` + encodeURIComponent('Debes indicar el motivo de la anulación.'));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('socios')
    .update({ anulado_en: new Date().toISOString(), anulado_por: user?.id ?? null, motivo_anulacion: motivo })
    .eq('id', id);

  if (error) {
    redirect(`/socios/${id}?error=` + encodeURIComponent(error.message));
  }

  revalidatePath('/socios');
  redirect('/socios');
}
