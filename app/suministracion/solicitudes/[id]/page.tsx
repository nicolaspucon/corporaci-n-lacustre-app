import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { resolverSolicitud } from '@/lib/actions/suministracion';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function SolicitudDetallePage({ params }: { params: { id: string } }) {
  await requireStaff();
  const supabase = createClient();

  const { data: solicitud } = await supabase
    .from('solicitudes_suministro')
    .select('*, socio:socios(cus, nombre_completo, estado)')
    .eq('id', params.id)
    .single();

  if (!solicitud) notFound();

  const socioId = solicitud.socio_id as string;
  const inicioMes = new Date();
  inicioMes.setDate(1);
  const inicioMesStr = inicioMes.toISOString().slice(0, 10);
  const [{ data: ficha }, { data: solicitudesMes }] = await Promise.all([
    supabase
      .from('fichas_perfil')
      .select('vigencia_receta, rango_maximo_g, consumo_mensual_estimado_g')
      .eq('socio_id', socioId)
      .maybeSingle(),
    supabase
      .from('solicitudes_suministro')
      .select('cantidad_solicitada_g')
      .eq('socio_id', socioId)
      .gte('fecha', inicioMesStr),
  ]);

  const hoy = new Date().toISOString().slice(0, 10);
  const tope = ficha?.rango_maximo_g ?? ficha?.consumo_mensual_estimado_g ?? null;
  const solicitadoMes = (solicitudesMes ?? []).reduce((sum, s) => sum + (Number(s.cantidad_solicitada_g) || 0), 0);
  const advertencias: string[] = [];
  const socioEstado = (solicitud.socio as any)?.estado;
  if (socioEstado && socioEstado !== 'activo') {
    advertencias.push(`El socio no está activo (estado: ${socioEstado}).`);
  }
  if (ficha?.vigencia_receta && ficha.vigencia_receta < hoy) {
    advertencias.push(`La receta médica venció el ${ficha.vigencia_receta}.`);
  }
  if (tope != null && solicitadoMes > tope) {
    advertencias.push(`El socio ya lleva ${solicitadoMes} g solicitados este mes, sobre un tope de ${tope} g.`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand mb-1">Solicitud {solicitud.n_control}</h1>
        <p className="text-sm text-neutral-500">
          {(solicitud.socio as any)?.cus} — {(solicitud.socio as any)?.nombre_completo} · {solicitud.fecha}
        </p>
      </div>

      <div className="card p-5 text-sm space-y-1">
        <p><span className="text-neutral-500">Material:</span> {solicitud.tipo_material ?? '—'}</p>
        <p><span className="text-neutral-500">Cantidad solicitada:</span> {solicitud.cantidad_solicitada_g ?? '—'} g</p>
        <p><span className="text-neutral-500">Observaciones:</span> {solicitud.observaciones ?? '—'}</p>
        <p><span className="text-neutral-500">Resolución actual:</span> <span className="capitalize">{solicitud.resolucion.replace('_', ' ')}</span></p>
      </div>

      {advertencias.length > 0 && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <p className="font-semibold mb-1">Antes de aprobar, ten en cuenta:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {advertencias.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <form action={resolverSolicitud} className="card p-6 space-y-4">
        <input type="hidden" name="solicitud_id" value={solicitud.id} />
        <div>
          <label className="label" htmlFor="resolucion">Resolución</label>
          <select className="input" id="resolucion" name="resolucion" defaultValue={solicitud.resolucion}>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="aprobada_parcial">Aprobada parcial</option>
            <option value="rechazada">Rechazada</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Guardar resolución
        </button>
      </form>

      {solicitud.resolucion === 'aprobada' && (
        <Link href={`/suministracion/entregas/nuevo?solicitud=${solicitud.id}`} className="btn-secondary inline-block">
          Registrar entrega para esta solicitud
        </Link>
      )}
    </div>
  );
}
