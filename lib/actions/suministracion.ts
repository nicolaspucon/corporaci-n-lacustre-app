'use server';

import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import { saldoActualLote } from '@/lib/inventario';
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
function inicioMesActual() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------
// Bloqueos duros: receta vigente, tope mensual según ficha de perfil, y
// stock disponible del lote. Se pueden forzar marcando "forzar_bloqueo" y
// dejando una justificación, que queda registrada en observaciones para
// que quede trazable ante una fiscalización.
// ---------------------------------------------------------------------

export async function crearSolicitud(formData: FormData) {
  const supabase = createClient();
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');

  const socioIdForm = str(formData, 'socio_id');
  const socioId = profile.rol === 'socio' ? profile.socio_id : socioIdForm;

  if (!socioId) {
    redirect('/suministracion/solicitudes/nuevo?error=' + encodeURIComponent('Debes indicar el socio solicitante.'));
  }

  const cantidadSolicitada = num(formData, 'cantidad_solicitada_g') ?? 0;
  const forzar = str(formData, 'forzar_bloqueo') === 'on';
  const justificacion = str(formData, 'justificacion_forzado');

  const [{ data: socio }, { data: ficha }, { data: solicitudesMes }] = await Promise.all([
    supabase.from('socios').select('estado').eq('id', socioId!).single(),
    supabase
      .from('fichas_perfil')
      .select('vigencia_receta, rango_maximo_g, consumo_mensual_estimado_g')
      .eq('socio_id', socioId!)
      .maybeSingle(),
    supabase
      .from('solicitudes_suministro')
      .select('cantidad_solicitada_g')
      .eq('socio_id', socioId!)
      .gte('fecha', inicioMesActual()),
  ]);

  const motivos: string[] = [];
  const hoy = new Date().toISOString().slice(0, 10);

  if (socio && socio.estado !== 'activo') {
    motivos.push(`El socio no está activo (estado actual: ${socio.estado}).`);
  }
  if (ficha?.vigencia_receta && ficha.vigencia_receta < hoy) {
    motivos.push(`La receta médica venció el ${ficha.vigencia_receta}.`);
  }
  const tope = ficha?.rango_maximo_g ?? ficha?.consumo_mensual_estimado_g ?? null;
  const solicitadoMes = (solicitudesMes ?? []).reduce((sum, s) => sum + (Number(s.cantidad_solicitada_g) || 0), 0);
  if (tope != null && solicitadoMes + cantidadSolicitada > tope) {
    motivos.push(
      `Supera el tope mensual autorizado: llevas ${solicitadoMes} g solicitados + ${cantidadSolicitada} g nuevos, de un tope de ${tope} g.`
    );
  }

  if (motivos.length > 0 && !forzar) {
    redirect(
      '/suministracion/solicitudes/nuevo?error=' +
        encodeURIComponent(
          `No se puede registrar la solicitud: ${motivos.join(' ')} Si corresponde igual continuar, marca "Forzar" e indica el motivo.`
        )
    );
  }
  if (motivos.length > 0 && forzar && !justificacion) {
    redirect(
      '/suministracion/solicitudes/nuevo?error=' +
        encodeURIComponent('Debes indicar la justificación para forzar esta solicitud.')
    );
  }

  const observacionesBase = str(formData, 'observaciones');
  const observaciones =
    motivos.length > 0 && forzar
      ? `${observacionesBase ?? ''}\n[FORZADO: ${motivos.join(' ')} Justificación: ${justificacion}]`.trim()
      : observacionesBase;

  const payload = {
    socio_id: socioId,
    fecha: str(formData, 'fecha') ?? new Date().toISOString().slice(0, 10),
    tipo_material: str(formData, 'tipo_material'),
    cantidad_solicitada_g: cantidadSolicitada || null,
    observaciones,
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

  const loteId = str(formData, 'lote_id');
  if (!loteId) {
    redirect(
      '/suministracion/entregas/nuevo?error=' +
        encodeURIComponent('Debes indicar el lote de origen (así queda registrada la variedad entregada).')
    );
  }

  const cantidadG = num(formData, 'cantidad_g') ?? 0;
  const forzar = str(formData, 'forzar_bloqueo') === 'on';
  const justificacion = str(formData, 'justificacion_forzado');
  const solicitudId = str(formData, 'solicitud_id');

  const [{ data: socio }, { data: ficha }, { data: entregasMes }, saldoLote] = await Promise.all([
    supabase.from('socios').select('estado').eq('id', socioId!).single(),
    supabase
      .from('fichas_perfil')
      .select('vigencia_receta, rango_maximo_g, consumo_mensual_estimado_g')
      .eq('socio_id', socioId!)
      .maybeSingle(),
    supabase.from('entregas').select('cantidad_g').eq('socio_id', socioId!).gte('fecha_hora', inicioMesActual()),
    saldoActualLote(supabase, loteId!),
  ]);

  const motivos: string[] = [];
  const hoy = new Date().toISOString().slice(0, 10);

  if (socio && socio.estado !== 'activo') {
    motivos.push(`El socio no está activo (estado actual: ${socio.estado}).`);
  }
  if (ficha?.vigencia_receta && ficha.vigencia_receta < hoy) {
    motivos.push(`La receta médica venció el ${ficha.vigencia_receta}.`);
  }
  const tope = ficha?.rango_maximo_g ?? ficha?.consumo_mensual_estimado_g ?? null;
  const entregadoMes = (entregasMes ?? []).reduce((sum, e) => sum + (Number(e.cantidad_g) || 0), 0);
  if (tope != null && entregadoMes + cantidadG > tope) {
    motivos.push(
      `Supera el tope mensual autorizado: llevas ${entregadoMes} g entregados + ${cantidadG} g nuevos, de un tope de ${tope} g.`
    );
  }
  if (cantidadG > saldoLote) {
    motivos.push(`No hay stock suficiente en el lote: disponible ${saldoLote} g, se intenta entregar ${cantidadG} g.`);
  }

  if (motivos.length > 0 && !forzar) {
    redirect(
      '/suministracion/entregas/nuevo?error=' +
        encodeURIComponent(
          `No se puede registrar la entrega: ${motivos.join(' ')} Si corresponde igual continuar, marca "Forzar" e indica el motivo.`
        )
    );
  }
  if (motivos.length > 0 && forzar && !justificacion) {
    redirect(
      '/suministracion/entregas/nuevo?error=' +
        encodeURIComponent('Debes indicar la justificación para forzar esta entrega.')
    );
  }

  const observacionesBase = str(formData, 'observaciones');
  const observaciones =
    motivos.length > 0 && forzar
      ? `${observacionesBase ?? ''}\n[FORZADO: ${motivos.join(' ')} Justificación: ${justificacion}]`.trim()
      : observacionesBase;

  const payload = {
    socio_id: socioId,
    lote_id: loteId,
    cantidad_g: cantidadG || null,
    destino: str(formData, 'destino'),
    responsable_entrega: profile?.id ?? null,
    solicitud_id: solicitudId,
    observaciones,
  };

  const { data, error } = await supabase
    .from('entregas')
    .insert(payload)
    .select('id, codigo, lote:lotes(codigo)')
    .single();
  if (error) {
    redirect('/suministracion/entregas/nuevo?error=' + encodeURIComponent(error.message));
  }

  if (solicitudId) {
    await supabase.from('solicitudes_suministro').update({ resolucion: 'aprobada' }).eq('id', solicitudId);
  }

  // Descuenta automáticamente la entrega del Registro de Inventario (salida),
  // vinculada al lote para poder calcular el stock disponible real.
  if (payload.cantidad_g) {
    const entregaCodigo = (data as any)?.codigo;
    const loteCodigo = (data as any)?.lote?.codigo ?? null;
    await supabase.from('registros_inventario').insert({
      fecha: new Date().toISOString().slice(0, 10),
      codigo: loteCodigo,
      lote_id: loteId,
      tipo_movimiento: 'salida',
      cantidad_g: payload.cantidad_g,
      documento_respaldo: entregaCodigo,
      observaciones: `Salida automática por entrega ${entregaCodigo ?? ''}.`,
      responsable: profile?.id ?? null,
      saldo_resultante_g: saldoLote - Number(payload.cantidad_g),
    });
    revalidatePath('/registros/inventario');
  }

  revalidatePath('/suministracion/entregas');
  redirect(`/suministracion/entregas/${data!.id}`);
}
