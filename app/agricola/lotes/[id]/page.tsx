import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { actualizarEstadoLote } from '@/lib/actions/agricola';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const ESTADOS = ['planificado', 'germinacion', 'vegetacion', 'floracion', 'cosechado', 'cerrado'];

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function LoteDetallePage({ params }: { params: { id: string } }) {
  await requireStaff();
  const supabase = createClient();

  const [{ data: lote }, { data: plantas }] = await Promise.all([
    supabase.from('lotes').select('*').eq('id', params.id).single(),
    supabase.from('plantas').select('id, codigo, variedad, estado_sanitario, fecha_germinacion, fecha_cosecha').eq('lote_id', params.id).order('codigo'),
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
      </div>

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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(plantas ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-neutral-500 py-6">Sin plantas registradas en este lote.</td>
                </tr>
              )}
              {(plantas ?? []).map((p) => (
                <tr key={p.id}>
                  <td>{p.codigo}</td>
                  <td>{p.variedad ?? '—'}</td>
                  <td>{p.estado_sanitario ?? '—'}</td>
                  <td>{p.fecha_germinacion ?? '—'}</td>
                  <td>{p.fecha_cosecha ?? '—'}</td>
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
