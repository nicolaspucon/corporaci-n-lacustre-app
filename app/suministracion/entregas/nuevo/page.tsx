import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { crearEntrega } from '@/lib/actions/suministracion';

export default async function NuevaEntregaPage({
  searchParams,
}: {
  searchParams: { error?: string; solicitud?: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const [{ data: socios }, { data: lotes }, solicitudRes] = await Promise.all([
    supabase.from('socios').select('id, cus, nombre_completo').eq('estado', 'activo').order('cus'),
    supabase.from('lotes').select('id, codigo').order('codigo', { ascending: false }),
    searchParams?.solicitud
      ? supabase.from('solicitudes_suministro').select('id, socio_id, cantidad_solicitada_g').eq('id', searchParams.solicitud).single()
      : Promise.resolve({ data: null }),
  ]);

  const solicitud = solicitudRes.data as any;

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Nueva entrega</h1>
      <p className="text-sm text-neutral-500 mb-6">El código EN- se genera automáticamente (Manual Cap. VIII).</p>

      <form action={crearEntrega} className="card p-6 space-y-4 max-w-2xl">
        {searchParams?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {searchParams.error}
          </p>
        )}
        {solicitud && <input type="hidden" name="solicitud_id" value={solicitud.id} />}

        <div>
          <label className="label" htmlFor="socio_id">Socio</label>
          <select className="input" id="socio_id" name="socio_id" defaultValue={solicitud?.socio_id ?? ''} required>
            <option value="">— Selecciona —</option>
            {(socios ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.cus} — {s.nombre_completo}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="lote_id">Lote de origen</label>
            <select className="input" id="lote_id" name="lote_id">
              <option value="">— Sin asignar —</option>
              {(lotes ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.codigo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cantidad_g">Cantidad entregada (g)</label>
            <input
              className="input"
              id="cantidad_g"
              name="cantidad_g"
              type="number"
              step="0.01"
              defaultValue={solicitud?.cantidad_solicitada_g ?? ''}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="observaciones">Observaciones</label>
          <textarea className="input" id="observaciones" name="observaciones" rows={3} />
        </div>

        <button type="submit" className="btn-primary">
          Registrar entrega
        </button>
      </form>
    </div>
  );
}
