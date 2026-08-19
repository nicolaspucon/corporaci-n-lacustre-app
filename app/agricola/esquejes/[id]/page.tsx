import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { actualizarResultadoEsqueje, promoverEsquejeALote } from '@/lib/actions/agricola';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const ESTADO_LABELS: Record<string, string> = {
  enraizamiento: 'En enraizamiento',
  listo: 'Listo para vegetación',
  pasado_a_lote: 'Pasado a lote',
  descartado: 'Descartado',
};

export default async function EsquejeDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const { data: esqueje } = await supabase
    .from('esquejes')
    .select('*, madre:plantas_madre(codigo, variedad), lote:lotes(codigo)')
    .eq('id', params.id)
    .single();

  if (!esqueje) notFound();

  const madre = esqueje.madre as any;
  const lote = esqueje.lote as any;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand mb-1">
          Esquejado {esqueje.codigo} <span className="text-neutral-400 font-normal">— {esqueje.variedad}</span>
        </h1>
        <p className="text-sm text-neutral-500">
          {ESTADO_LABELS[esqueje.estado] ?? esqueje.estado} · {esqueje.fecha}
        </p>
      </div>

      {searchParams?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {searchParams.error}
        </p>
      )}

      <div className="card p-5 text-sm space-y-1">
        <p><span className="text-neutral-500">Madre de origen:</span> {madre ? `${madre.codigo} — ${madre.variedad}` : 'Sin madre específica'}</p>
        <p><span className="text-neutral-500">Banco de semillas:</span> {esqueje.banco_semillas ?? '—'}</p>
        <p><span className="text-neutral-500">% THC / % CBD:</span> {esqueje.thc_pct ?? '—'} / {esqueje.cbd_pct ?? '—'}</p>
        <p><span className="text-neutral-500">Esquejes realizados:</span> {esqueje.cantidad_realizados}</p>
        <p><span className="text-neutral-500">Enraizados sanos:</span> {esqueje.cantidad_enraizadas ?? '—'}</p>
        <p><span className="text-neutral-500">Perdidos:</span> {esqueje.cantidad_perdidas ?? '—'}</p>
        <p><span className="text-neutral-500">Observaciones:</span> {esqueje.observaciones ?? '—'}</p>
        {lote && (
          <p>
            <span className="text-neutral-500">Lote generado:</span>{' '}
            <Link href={`/agricola/lotes/${esqueje.lote_id}`} className="text-brand underline">
              {lote.codigo}
            </Link>
          </p>
        )}
      </div>

      {esqueje.estado === 'enraizamiento' && (
        <section>
          <h2 className="font-semibold text-brand mb-2">Registrar resultado de enraizamiento</h2>
          <p className="text-sm text-neutral-500 mb-3">
            De los {esqueje.cantidad_realizados} esquejes realizados, ¿cuántos enraizaron sanos? El resto
            queda registrado como pérdida.
          </p>
          <form action={actualizarResultadoEsqueje} className="card p-5 flex items-end gap-3">
            <input type="hidden" name="esqueje_id" value={esqueje.id} />
            <div className="flex-1">
              <label className="label" htmlFor="cantidad_enraizadas">Enraizados sanos</label>
              <input
                className="input"
                id="cantidad_enraizadas"
                name="cantidad_enraizadas"
                type="number"
                min={0}
                max={esqueje.cantidad_realizados}
                required
              />
            </div>
            <button type="submit" className="btn-primary">
              Guardar resultado
            </button>
          </form>
        </section>
      )}

      {esqueje.estado === 'listo' && (
        <section>
          <h2 className="font-semibold text-brand mb-2">Pasar a vegetación (crear lote)</h2>
          <p className="text-sm text-neutral-500 mb-3">
            Se creará un lote con {esqueje.cantidad_enraizadas} plantas de {esqueje.variedad}, ya con la
            variedad, producción esperada, banco de semillas y % THC/CBD prellenados.
          </p>
          <form action={promoverEsquejeALote} className="card p-6 space-y-4">
            <input type="hidden" name="esqueje_id" value={esqueje.id} />

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="fecha_inicio">Fecha de inicio en vegetación</label>
                <input
                  className="input"
                  id="fecha_inicio"
                  name="fecha_inicio"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div>
                <label className="label" htmlFor="area_m2">Área (m²)</label>
                <input className="input" id="area_m2" name="area_m2" type="number" step="0.01" />
              </div>
            </div>

            <p className="label !mb-0 pt-2">Duración por etapa (semanas)</p>
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <label className="label" htmlFor="sem_germinacion">Germinación</label>
                <input className="input" id="sem_germinacion" name="sem_germinacion" type="number" defaultValue={0} />
                <p className="text-xs text-neutral-400 mt-1">Clones: normalmente 0.</p>
              </div>
              <div>
                <label className="label" htmlFor="sem_vegetacion">Vegetación</label>
                <input className="input" id="sem_vegetacion" name="sem_vegetacion" type="number" defaultValue={5} />
              </div>
              <div>
                <label className="label" htmlFor="sem_floracion">Floración</label>
                <input className="input" id="sem_floracion" name="sem_floracion" type="number" defaultValue={11} />
              </div>
              <div>
                <label className="label" htmlFor="sem_cosecha">Cosecha/secado</label>
                <input className="input" id="sem_cosecha" name="sem_cosecha" type="number" defaultValue={1} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="rendimiento_esperado_m2">Rendimiento esperado (g/m²)</label>
                <input className="input" id="rendimiento_esperado_m2" name="rendimiento_esperado_m2" type="number" step="0.01" />
              </div>
              <div>
                <label className="label" htmlFor="rendimiento_esperado_planta">Rendimiento esperado (g/planta)</label>
                <input className="input" id="rendimiento_esperado_planta" name="rendimiento_esperado_planta" type="number" step="0.01" />
              </div>
            </div>

            <button type="submit" className="btn-primary">
              Crear lote con {esqueje.cantidad_enraizadas} plantas
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
