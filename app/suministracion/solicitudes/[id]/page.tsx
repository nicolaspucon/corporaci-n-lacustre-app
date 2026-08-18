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
    .select('*, socio:socios(cus, nombre_completo)')
    .eq('id', params.id)
    .single();

  if (!solicitud) notFound();

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
