import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { actualizarPlanta, anularPlanta } from '@/lib/actions/agricola';
import AnularForm from '@/components/AnularForm';
import AnuladoBanner from '@/components/AnuladoBanner';
import { notFound } from 'next/navigation';

export default async function PlantaDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const { data: planta } = await supabase
    .from('plantas')
    .select('*, lote:lotes(codigo, cultivo_genetica), anulador:profiles!anulado_por(nombre_completo), editor:profiles!updated_by(nombre_completo)')
    .eq('id', params.id)
    .single();

  if (!planta) notFound();
  const anulado = !!planta.anulado_en;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand mb-1">Planta {planta.codigo}</h1>
        <p className="text-sm text-neutral-500">
          Lote: {(planta.lote as any)?.codigo ?? 'sin asignar'} · Origen: {planta.origen ?? '—'} · Variedad: {planta.variedad ?? '—'}
        </p>
        <p className="text-sm text-neutral-500">Fecha de germinación: {planta.fecha_germinacion ?? '—'}</p>
        <p className="text-sm text-neutral-500">
          Producción esperada: {planta.produccion_esperada_g ? `${planta.produccion_esperada_g} g` : '—'}
        </p>
        <p className="text-sm text-neutral-500">
          Banco de semillas: {planta.banco_semillas ?? '—'} · % THC: {planta.thc_pct ?? '—'} · % CBD: {planta.cbd_pct ?? '—'}
        </p>
        {planta.updated_at && (
          <p className="text-xs text-neutral-400 mt-1">
            Última edición: {new Date(planta.updated_at).toLocaleString('es-CL')} · {planta.editor?.nombre_completo ?? '—'}
          </p>
        )}
      </div>

      {anulado && (
        <AnuladoBanner fecha={planta.anulado_en} anuladoPor={planta.anulador?.nombre_completo} motivo={planta.motivo_anulacion} />
      )}

      {searchParams?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {searchParams.error}
        </p>
      )}

      {!anulado && (
        <form action={actualizarPlanta} className="card p-6 space-y-4">
          <input type="hidden" name="planta_id" value={planta.id} />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="estado_sanitario">Estado sanitario</label>
              <input className="input" id="estado_sanitario" name="estado_sanitario" defaultValue={planta.estado_sanitario ?? ''} />
            </div>
            <div>
              <label className="label" htmlFor="ubicacion">Ubicación</label>
              <input className="input" id="ubicacion" name="ubicacion" defaultValue={planta.ubicacion ?? ''} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="fecha_cosecha">Fecha de cosecha</label>
            <input className="input" id="fecha_cosecha" name="fecha_cosecha" type="date" defaultValue={planta.fecha_cosecha ?? ''} />
          </div>

          <div>
            <label className="label" htmlFor="banco_semillas">Banco de semillas</label>
            <input className="input" id="banco_semillas" name="banco_semillas" defaultValue={planta.banco_semillas ?? ''} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="thc_pct">% THC</label>
              <input className="input" id="thc_pct" name="thc_pct" type="number" step="0.01" defaultValue={planta.thc_pct ?? ''} />
            </div>
            <div>
              <label className="label" htmlFor="cbd_pct">% CBD</label>
              <input className="input" id="cbd_pct" name="cbd_pct" type="number" step="0.01" defaultValue={planta.cbd_pct ?? ''} />
            </div>
          </div>
          <p className="text-xs text-neutral-400 -mt-2">
            Se prellenan solos desde el lote (o desde la madre/esqueje de origen) al crear la planta; corrígelos
            aquí si un análisis de laboratorio da un resultado distinto.
          </p>

          <div>
            <label className="label" htmlFor="observaciones">Observaciones</label>
            <textarea className="input" id="observaciones" name="observaciones" rows={4} defaultValue={planta.observaciones ?? ''} />
          </div>

          <button type="submit" className="btn-primary">
            Guardar cambios
          </button>
        </form>
      )}

      {!anulado && <AnularForm action={anularPlanta} idField="planta_id" idValue={planta.id} label="planta" />}
    </div>
  );
}
