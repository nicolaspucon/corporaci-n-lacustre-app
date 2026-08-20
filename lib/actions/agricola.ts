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
function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function calcularFechaCosecha(
  fechaInicio: string,
  semGerminacion: number | null,
  semVegetacion: number | null,
  semFloracion: number | null
) {
  const semanas = (semGerminacion ?? 0) + (semVegetacion ?? 0) + (semFloracion ?? 0);
  return addDays(fechaInicio, semanas * 7);
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
    banco_semillas: str(formData, 'banco_semillas'),
    thc_pct: num(formData, 'thc_pct'),
    cbd_pct: num(formData, 'cbd_pct'),
  };

  const { data, error } = await supabase.from('lotes').insert(payload).select('id').single();
  if (error) {
    redirect('/agricola/lotes/nuevo?error=' + encodeURIComponent(error.message));
  }

  // Genera automáticamente una ficha de planta (CP-) por cada planta indicada en el
  // lote, con variedad, fecha de cosecha estimada, producción esperada, banco de
  // semillas y % THC/CBD ya prellenados, ya que esa información se conoce desde
  // que se crea el lote.
  if (payload.n_plantas && payload.n_plantas > 0) {
    const fechaCosecha = calcularFechaCosecha(
      fecha_inicio!,
      payload.sem_germinacion,
      payload.sem_vegetacion,
      payload.sem_floracion
    );
    const nuevasPlantas = Array.from({ length: payload.n_plantas }, () => ({
      lote_id: data!.id,
      variedad: payload.cultivo_genetica,
      fecha_germinacion: fecha_inicio,
      fecha_cosecha: fechaCosecha,
      produccion_esperada_g: payload.rendimiento_esperado_planta,
      banco_semillas: payload.banco_semillas,
      thc_pct: payload.thc_pct,
      cbd_pct: payload.cbd_pct,
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
  const user = await usuarioActual(supabase);
  const patch: Record<string, unknown> = { estado, updated_at: new Date().toISOString(), updated_by: user?.id ?? null };
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

// Corrección de datos genéticos del lote (ej. tras un análisis de laboratorio
// que confirma el % real de THC/CBD, distinto de la estimación inicial).
export async function actualizarGeneticaLote(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('lote_id'));
  const user = await usuarioActual(supabase);
  const patch = {
    banco_semillas: str(formData, 'banco_semillas'),
    thc_pct: num(formData, 'thc_pct'),
    cbd_pct: num(formData, 'cbd_pct'),
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  };
  await supabase.from('lotes').update(patch).eq('id', id);
  revalidatePath(`/agricola/lotes/${id}`);
  revalidatePath('/agricola/lotes');
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
    banco_semillas: str(formData, 'banco_semillas'),
    thc_pct: num(formData, 'thc_pct'),
    cbd_pct: num(formData, 'cbd_pct'),
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
  const user = await usuarioActual(supabase);
  const patch = {
    estado_sanitario: str(formData, 'estado_sanitario'),
    ubicacion: str(formData, 'ubicacion'),
    observaciones: str(formData, 'observaciones'),
    fecha_cosecha: str(formData, 'fecha_cosecha'),
    banco_semillas: str(formData, 'banco_semillas'),
    thc_pct: num(formData, 'thc_pct'),
    cbd_pct: num(formData, 'cbd_pct'),
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  };
  await supabase.from('plantas').update(patch).eq('id', id);
  revalidatePath(`/agricola/plantas/${id}`);
  revalidatePath('/agricola/plantas');
}

// ---------------------------------------------------------------------
// Madres
// ---------------------------------------------------------------------

export async function crearMadre(formData: FormData) {
  const supabase = createClient();
  const profile = await getSessionProfile();

  const variedad = str(formData, 'variedad');
  if (!variedad) {
    redirect('/agricola/madres/nuevo?error=' + encodeURIComponent('La variedad es obligatoria.'));
  }

  const payload = {
    variedad,
    fecha_inicio: str(formData, 'fecha_inicio') ?? new Date().toISOString().slice(0, 10),
    ubicacion: str(formData, 'ubicacion'),
    observaciones: str(formData, 'observaciones'),
    responsable: profile?.id ?? null,
    banco_semillas: str(formData, 'banco_semillas'),
    thc_pct: num(formData, 'thc_pct'),
    cbd_pct: num(formData, 'cbd_pct'),
  };

  const { data, error } = await supabase.from('plantas_madre').insert(payload).select('id').single();
  if (error) {
    redirect('/agricola/madres/nuevo?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/agricola/madres');
  redirect(`/agricola/madres/${data!.id}`);
}

export async function actualizarEstadoMadre(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('madre_id'));
  const estado = String(formData.get('estado'));
  const user = await usuarioActual(supabase);
  await supabase
    .from('plantas_madre')
    .update({ estado, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
    .eq('id', id);
  revalidatePath(`/agricola/madres/${id}`);
  revalidatePath('/agricola/madres');
}

// Corrección de datos genéticos de la madre (ej. tras un análisis de laboratorio).
export async function actualizarGeneticaMadre(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('madre_id'));
  const user = await usuarioActual(supabase);
  const patch = {
    banco_semillas: str(formData, 'banco_semillas'),
    thc_pct: num(formData, 'thc_pct'),
    cbd_pct: num(formData, 'cbd_pct'),
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  };
  await supabase.from('plantas_madre').update(patch).eq('id', id);
  revalidatePath(`/agricola/madres/${id}`);
  revalidatePath('/agricola/madres');
}

// ---------------------------------------------------------------------
// Esquejes (propagación)
// ---------------------------------------------------------------------

export async function crearEsqueje(formData: FormData) {
  const supabase = createClient();
  const profile = await getSessionProfile();

  const cantidad_realizados = num(formData, 'cantidad_realizados');
  const madreId = str(formData, 'madre_id');

  let variedad = str(formData, 'variedad');
  let banco_semillas = str(formData, 'banco_semillas');
  let thc_pct = num(formData, 'thc_pct');
  let cbd_pct = num(formData, 'cbd_pct');

  // Un esqueje es genéticamente idéntico a su madre: si se eligió una madre,
  // sus datos (variedad, banco de semillas, % THC/CBD) mandan sobre lo escrito
  // a mano en el formulario.
  if (madreId) {
    const { data: madre } = await supabase
      .from('plantas_madre')
      .select('variedad, banco_semillas, thc_pct, cbd_pct')
      .eq('id', madreId)
      .maybeSingle();
    if (madre) {
      variedad = madre.variedad ?? variedad;
      banco_semillas = madre.banco_semillas ?? banco_semillas;
      thc_pct = madre.thc_pct ?? thc_pct;
      cbd_pct = madre.cbd_pct ?? cbd_pct;
    }
  }

  if (!variedad || !cantidad_realizados) {
    redirect(
      '/agricola/esquejes/nuevo?error=' + encodeURIComponent('Variedad y cantidad de esquejes son obligatorios.')
    );
  }

  const payload = {
    madre_id: madreId,
    variedad,
    fecha: str(formData, 'fecha') ?? new Date().toISOString().slice(0, 10),
    cantidad_realizados,
    observaciones: str(formData, 'observaciones'),
    responsable: profile?.id ?? null,
    banco_semillas,
    thc_pct,
    cbd_pct,
  };

  const { data, error } = await supabase.from('esquejes').insert(payload).select('id').single();
  if (error) {
    redirect('/agricola/esquejes/nuevo?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/agricola/esquejes');
  redirect(`/agricola/esquejes/${data!.id}`);
}

export async function actualizarResultadoEsqueje(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('esqueje_id'));
  const cantidad_enraizadas = num(formData, 'cantidad_enraizadas');

  const { data: esqueje } = await supabase.from('esquejes').select('cantidad_realizados').eq('id', id).single();
  if (!esqueje) redirect('/agricola/esquejes');

  if (cantidad_enraizadas === null || cantidad_enraizadas < 0 || cantidad_enraizadas > esqueje!.cantidad_realizados) {
    redirect(
      `/agricola/esquejes/${id}?error=` +
        encodeURIComponent('La cantidad enraizada debe ser un número válido entre 0 y el total realizado.')
    );
  }

  const cantidad_perdidas = esqueje!.cantidad_realizados - cantidad_enraizadas!;
  const user = await usuarioActual(supabase);

  await supabase
    .from('esquejes')
    .update({
      cantidad_enraizadas,
      cantidad_perdidas,
      estado: cantidad_enraizadas! > 0 ? 'listo' : 'descartado',
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq('id', id);

  revalidatePath(`/agricola/esquejes/${id}`);
  revalidatePath('/agricola/esquejes');
}

export async function promoverEsquejeALote(formData: FormData) {
  const supabase = createClient();
  const esquejeId = String(formData.get('esqueje_id'));

  const { data: esqueje } = await supabase.from('esquejes').select('*').eq('id', esquejeId).single();
  if (!esqueje) redirect('/agricola/esquejes');

  if (!esqueje!.cantidad_enraizadas || esqueje!.cantidad_enraizadas <= 0) {
    redirect(
      `/agricola/esquejes/${esquejeId}?error=` +
        encodeURIComponent('Registra primero cuántos esquejes enraizaron sanos antes de pasarlos a vegetación.')
    );
  }

  const fecha_inicio = str(formData, 'fecha_inicio') ?? new Date().toISOString().slice(0, 10);
  const sem_germinacion = num(formData, 'sem_germinacion') ?? 0;
  const sem_vegetacion = num(formData, 'sem_vegetacion') ?? 5;
  const sem_floracion = num(formData, 'sem_floracion') ?? 11;
  const sem_cosecha = num(formData, 'sem_cosecha') ?? 1;
  const rendimiento_esperado_m2 = num(formData, 'rendimiento_esperado_m2');
  const rendimiento_esperado_planta = num(formData, 'rendimiento_esperado_planta');

  const lotePayload = {
    fecha_inicio,
    area_m2: num(formData, 'area_m2'),
    cultivo_genetica: esqueje!.variedad,
    n_plantas: esqueje!.cantidad_enraizadas,
    sem_germinacion,
    sem_vegetacion,
    sem_floracion,
    sem_cosecha,
    rendimiento_esperado_m2,
    rendimiento_esperado_planta,
    origen_esqueje_id: esqueje!.id,
    // El lote hereda la genética del esqueje (que a su vez la heredó de la madre).
    banco_semillas: esqueje!.banco_semillas,
    thc_pct: esqueje!.thc_pct,
    cbd_pct: esqueje!.cbd_pct,
  };

  const { data: lote, error } = await supabase.from('lotes').insert(lotePayload).select('id').single();
  if (error) {
    redirect(`/agricola/esquejes/${esquejeId}?error=` + encodeURIComponent(error.message));
  }

  const fechaCosecha = calcularFechaCosecha(fecha_inicio, sem_germinacion, sem_vegetacion, sem_floracion);
  const nuevasPlantas = Array.from({ length: esqueje!.cantidad_enraizadas }, () => ({
    lote_id: lote!.id,
    variedad: esqueje!.variedad,
    fecha_germinacion: fecha_inicio,
    fecha_cosecha: fechaCosecha,
    produccion_esperada_g: rendimiento_esperado_planta,
    banco_semillas: esqueje!.banco_semillas,
    thc_pct: esqueje!.thc_pct,
    cbd_pct: esqueje!.cbd_pct,
    estado_sanitario: 'sano',
  }));
  await supabase.from('plantas').insert(nuevasPlantas);

  await supabase.from('esquejes').update({ estado: 'pasado_a_lote', lote_id: lote!.id }).eq('id', esquejeId);

  revalidatePath('/agricola/lotes');
  revalidatePath('/agricola/plantas');
  revalidatePath('/agricola/esquejes');
  revalidatePath('/agricola/planificacion');
  redirect(`/agricola/lotes/${lote!.id}?plantas_creadas=${esqueje!.cantidad_enraizadas}`);
}

// ---------------------------------------------------------------------
// Anular (para corregir errores de ingreso, sin borrar el historial)
// ---------------------------------------------------------------------

async function usuarioActual(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function anularLote(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('lote_id') || '');
  const motivo = String(formData.get('motivo') || '').trim();
  if (!id) redirect('/agricola/lotes');
  if (!motivo) {
    redirect(`/agricola/lotes/${id}?error=` + encodeURIComponent('Debes indicar el motivo de la anulación.'));
  }

  const user = await usuarioActual(supabase);
  const now = new Date().toISOString();
  const patch = { anulado_en: now, anulado_por: user?.id ?? null, motivo_anulacion: motivo };

  // Si fue un error, se anulan también las fichas de planta generadas
  // automáticamente para este lote, con el mismo motivo.
  await supabase.from('plantas').update(patch).eq('lote_id', id).is('anulado_en', null);

  const { error } = await supabase.from('lotes').update(patch).eq('id', id);
  if (error) {
    redirect(`/agricola/lotes/${id}?error=` + encodeURIComponent(error.message));
  }

  revalidatePath('/agricola/lotes');
  revalidatePath('/agricola/plantas');
  revalidatePath('/agricola/planificacion');
  redirect('/agricola/lotes');
}

export async function anularPlanta(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('planta_id') || '');
  const motivo = String(formData.get('motivo') || '').trim();
  if (!id) redirect('/agricola/plantas');
  if (!motivo) {
    redirect(`/agricola/plantas/${id}?error=` + encodeURIComponent('Debes indicar el motivo de la anulación.'));
  }

  const user = await usuarioActual(supabase);
  const { error } = await supabase
    .from('plantas')
    .update({ anulado_en: new Date().toISOString(), anulado_por: user?.id ?? null, motivo_anulacion: motivo })
    .eq('id', id);

  if (error) {
    redirect(`/agricola/plantas/${id}?error=` + encodeURIComponent(error.message));
  }

  revalidatePath('/agricola/plantas');
  redirect('/agricola/plantas');
}

export async function anularMadre(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('madre_id') || '');
  const motivo = String(formData.get('motivo') || '').trim();
  if (!id) redirect('/agricola/madres');
  if (!motivo) {
    redirect(`/agricola/madres/${id}?error=` + encodeURIComponent('Debes indicar el motivo de la anulación.'));
  }

  const user = await usuarioActual(supabase);
  const { error } = await supabase
    .from('plantas_madre')
    .update({ anulado_en: new Date().toISOString(), anulado_por: user?.id ?? null, motivo_anulacion: motivo })
    .eq('id', id);

  if (error) {
    redirect(`/agricola/madres/${id}?error=` + encodeURIComponent(error.message));
  }

  revalidatePath('/agricola/madres');
  redirect('/agricola/madres');
}

export async function anularEsqueje(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('esqueje_id') || '');
  const motivo = String(formData.get('motivo') || '').trim();
  if (!id) redirect('/agricola/esquejes');
  if (!motivo) {
    redirect(`/agricola/esquejes/${id}?error=` + encodeURIComponent('Debes indicar el motivo de la anulación.'));
  }

  const user = await usuarioActual(supabase);
  const { error } = await supabase
    .from('esquejes')
    .update({ anulado_en: new Date().toISOString(), anulado_por: user?.id ?? null, motivo_anulacion: motivo })
    .eq('id', id);

  if (error) {
    redirect(`/agricola/esquejes/${id}?error=` + encodeURIComponent(error.message));
  }

  revalidatePath('/agricola/esquejes');
  redirect('/agricola/esquejes');
}
