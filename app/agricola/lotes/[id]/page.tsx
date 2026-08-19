import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { actualizarEstadoLote, actualizarGeneticaLote } from '@/lib/actions/agricola';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const ESTADOS = ['planificado', 'germinacion', 'vegetacion', 'floracion', 'cosechado', 'cerrado'];

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function LoteDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { plantas_creadas?: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const [{ data: lote }, { data: plantas }] = await Promise.all([
    supabase.from('lotes').select('*').eq('id', params.id).single(),
    supabase.from('plantas').select('id, codigo, variedad, estado_sanitario, fecha_germinacion, fecha_cosecha, produccion_esperada_g').eq('lote_id', params.id).order('codigo'),
  ]);

  if (!lote) notFound();

  const inicio = lote.fecha_inicio as string;
  const finGerminacion = addDays(inicio, (lote.sem_germinacion ?? 0) * 7);
  const finVegetacion = addDays(finGerminacion, (lote.sem_vegetacion ?? 0) * 7);
  const finFloracion = addDays(finVegetacion, (lote.sem_floracion ?? 0) * 7);
  const finCosecha = addDays(finFloracion, (lote.sem_cosecha ?? 0) * 7);

  const etapas = [
    { label: 'Germinación', inicio, fin: finGerminacion },
    { label: 'Vegetación', inicio: finGerminacion, fin: finVegetacion },
    { label: 'Floración', inicio: finVegetacion, fin: finFloracion },
    { label: 'Cosecha / secado', inicio: finFloracion, fin: finCosecha },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      {searchParams?.plantas_creadas && (
        <p className="text-sm text-brand bg-brand-pale rounded px-3 py-2">
          Se generaron automáticamente {searchParams.plantas_creadas} fichas de planta para este lote.
        </p>
      )}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-brand">Lote {lote.codigo}</h1>
          <form action={actualizarEstadoLote} className="flex items-center gap-2">
            <input type="hidden" name="lote_id" value={lote.id} />
            <select name="estado" defaultValue={lote.estado} className="input py-1 text-sm w-auto">
              {ESTADOS.map((e) => (
                <option key={e} value={e} className="capitalize">{e}</option>
              ))}
            </select>
            <button type="submit" className="btn-secondary text-sm">Actualizar estado</button>
          </form>
        </div>
        <p className="text-sm text-neutral-500">
          {lote.cultivo_genetica ?? 'Genética no especificada'} · {lote.area_m2 ?? '—'} m² · {lote.n_plantas ?? '—'} plantas planificadas
        </p>
        <p className="text-sm text-neutral-500">
          Banco de semillas: {lote.banco_semillas ?? '—'} · % THC: {lote.thc_pct ?? '—'} · % CBD: {lote.cbd_pct ?? '—'}
        </p>
      </div>

      <section>
        <h2 className="font-semibold text-brand mb-2">Editar datos genéticos</h2>
        <p className="text-sm text-neutral-500 mb-3">
          Útil para corregir con el resultado de un análisis de laboratorio. Estos datos son los que se
          muestran en el rótulo de transporte y en la verificación por QR de las entregas de este lote.
        </p>
        <form action={actualizarGeneticaLote} className="card p-5 grid sm:grid-cols-3 gap-4 items-end">
          <input type="hidden" name="lote_id" value={lote.id} />
          <div>
            <label className="label" htmlFor="banco_semillas">Banco de semillas</label>
            <input className="input" id="banco_semillas" name="banco_semillas" defaultValue={lote.banco_semillas ?? ''} />
          </div>
          <div>
            <label className="label" htmlFor="thc_pct">% THC</label>
            <input className="input" id="thc_pct" name="thc_pct" type="number" step="0.01" defaultValue={lote.thc_pct ?? ''} />
          </div>
          <div>
            <label className="label" htmlFor="cbd_pct">% CBD</label>
            <input className="input" id="cbd_pct" name="cbd_pct" type="number" step="0.01" defaultValue={lote.cbd_pct ?? ''} />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-secondary text-sm">
              Guardar datos genéticos
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-semibold text-brand mb-3">Planificación calculada</h2>
        <div className="card overflow-x-auto">
          <table className="data-table w-full border-collapse">
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Inicio estimado</th>
                <th>Fin estimado</th>
              </tr>
            </thead>
            <tbody>
              {etapas.map((e) => (
                <tr key={e.label}>
                  <td>{e.label}</td>
                  <td>{e.inicio}</td>
                  <td>{e.fin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          Fechas calculadas automáticamente a partir de la fecha de inicio y las semanas por etapa. Ver vista
          completa en Planificación (Gantt).
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-brand">Plantas de este lote</h2>
          <Link href="/agricola/plantas/nuevo" className="btn-secondary text-sm">
            + Registrar planta
          </Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="data-table w-full border-collapse">
            <thead>
              <tr>
                <th>Código</th>
                <th>Variedad</th>
                <th>Estado sanitario</th>
                <th>Germinación</th>
                <th>Cosecha</th>
                <th>Producción esperada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(plantas ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-neutral-500 py-6">Sin plantas registradas en este lote.</td>
                </tr>
              )}
              {(plantas ?? []).map((p) => (
                <tr key={p.id}>
                  <td>{p.codigo}</td>
                  <td>{p.variedad ?? '—'}</td>
                  <td>{p.estado_sanitario ?? '—'}</td>
                  <td>{p.fecha_germinacion ?? '—'}</td>
                  <td>{p.fecha_cosecha ?? '—'}</td>
                  <td>{p.produccion_esperada_g ? `${p.produccion_esperada_g} g` : '—'}</td>
                  <td><Link href={`/agricola/plantas/${p.id}`} className="text-brand underline">Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {lote.estado === 'cerrado' && (
        <section>
          <h2 className="font-semibold text-brand mb-1">Evaluación final</h2>
          <p className="text-sm text-neutral-600">{lote.evaluacion_final ?? 'Sin evaluación registrada.'}</p>
          <p className="text-xs text-neutral-400">Cerrado el {lote.fecha_cierre}</p>
        </section>
      )}
    </div>
  );
}
