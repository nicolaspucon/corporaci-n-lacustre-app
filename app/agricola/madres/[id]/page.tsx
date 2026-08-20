import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { actualizarEstadoMadre, actualizarGeneticaMadre, anularMadre } from '@/lib/actions/agricola';
import AnularForm from '@/components/AnularForm';
import AnuladoBanner from '@/components/AnuladoBanner';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const ESTADOS = ['activa', 'retirada'];

export default async function MadreDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const [{ data: madre }, { data: esquejes }] = await Promise.all([
    supabase
      .from('plantas_madre')
      .select('*, anulador:profiles!anulado_por(nombre_completo), editor:profiles!updated_by(nombre_completo)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('esquejes')
      .select('id, codigo, fecha, cantidad_realizados, cantidad_enraizadas, estado')
      .eq('madre_id', params.id)
      .is('anulado_en', null)
      .order('fecha', { ascending: false }),
  ]);

  if (!madre) notFound();
  const anulado = !!madre.anulado_en;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">
          Madre {madre.codigo} <span className="text-neutral-400 font-normal">— {madre.variedad}</span>
        </h1>
        {!anulado && (
          <form action={actualizarEstadoMadre} className="flex items-center gap-2">
            <input type="hidden" name="madre_id" value={madre.id} />
            <select name="estado" defaultValue={madre.estado} className="input py-1 text-sm w-auto">
              {ESTADOS.map((e) => (
                <option key={e} value={e} className="capitalize">
                  {e}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-secondary text-sm">
              Actualizar
            </button>
          </form>
        )}
      </div>

      {madre.updated_at && (
        <p className="text-xs text-neutral-400 -mt-4">
          Última edición: {new Date(madre.updated_at).toLocaleString('es-CL')} · {madre.editor?.nombre_completo ?? '—'}
        </p>
      )}

      {anulado && (
        <AnuladoBanner fecha={madre.anulado_en} anuladoPor={madre.anulador?.nombre_completo} motivo={madre.motivo_anulacion} />
      )}

      {searchParams?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {searchParams.error}
        </p>
      )}

      <div className="card p-5 text-sm space-y-1">
        <p><span className="text-neutral-500">Fecha de inicio:</span> {madre.fecha_inicio}</p>
        <p><span className="text-neutral-500">Banco de semillas:</span> {madre.banco_semillas ?? '—'}</p>
        <p><span className="text-neutral-500">% THC / % CBD:</span> {madre.thc_pct ?? '—'} / {madre.cbd_pct ?? '—'}</p>
        <p><span className="text-neutral-500">Ubicación:</span> {madre.ubicacion ?? '—'}</p>
        <p><span className="text-neutral-500">Observaciones:</span> {madre.observaciones ?? '—'}</p>
      </div>

      {!anulado && (
        <section>
          <h2 className="font-semibold text-brand mb-2">Editar datos genéticos</h2>
          <p className="text-sm text-neutral-500 mb-3">
            Útil para corregir con el resultado de un análisis de laboratorio. Se copian solos a los esquejes
            nuevos que se saquen de esta madre (los ya existentes no cambian).
          </p>
          <form action={actualizarGeneticaMadre} className="card p-5 grid sm:grid-cols-3 gap-4 items-end">
            <input type="hidden" name="madre_id" value={madre.id} />
            <div>
              <label className="label" htmlFor="banco_semillas">Banco de semillas</label>
              <input className="input" id="banco_semillas" name="banco_semillas" defaultValue={madre.banco_semillas ?? ''} />
            </div>
            <div>
              <label className="label" htmlFor="thc_pct">% THC</label>
              <input className="input" id="thc_pct" name="thc_pct" type="number" step="0.01" defaultValue={madre.thc_pct ?? ''} />
            </div>
            <div>
              <label className="label" htmlFor="cbd_pct">% CBD</label>
              <input className="input" id="cbd_pct" name="cbd_pct" type="number" step="0.01" defaultValue={madre.cbd_pct ?? ''} />
            </div>
            <div className="sm:col-span-3">
              <button type="submit" className="btn-secondary text-sm">
                Guardar datos genéticos
              </button>
            </div>
          </form>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-brand">Esquejes sacados de esta madre</h2>
          {!anulado && (
            <Link href={`/agricola/esquejes/nuevo?madre_id=${madre.id}`} className="btn-secondary text-sm">
              + Nuevo esquejado
            </Link>
          )}
        </div>
        <div className="card divide-y">
          {(esquejes ?? []).length === 0 && (
            <p className="px-4 py-6 text-sm text-neutral-500 text-center">
              Todavía no se han sacado esquejes de esta madre.
            </p>
          )}
          {(esquejes ?? []).map((e) => (
            <Link
              key={e.id}
              href={`/agricola/esquejes/${e.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-50"
            >
              <div>
                <p className="font-medium">{e.codigo}</p>
                <p className="text-xs text-neutral-400">{e.fecha}</p>
              </div>
              <p className="text-neutral-500">
                {e.cantidad_enraizadas ?? '—'} / {e.cantidad_realizados} enraizados ·{' '}
                <span className="capitalize">{e.estado.replace('_', ' ')}</span>
              </p>
            </Link>
          ))}
        </div>
      </section>

      {!anulado && <AnularForm action={anularMadre} idField="madre_id" idValue={madre.id} label="madre" />}
    </div>
  );
}
