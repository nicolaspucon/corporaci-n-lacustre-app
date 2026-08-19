import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { crearEsqueje } from '@/lib/actions/agricola';

export default async function NuevoEsquejePage({
  searchParams,
}: {
  searchParams: { error?: string; madre_id?: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const { data: madres } = await supabase
    .from('plantas_madre')
    .select('id, codigo, variedad')
    .eq('estado', 'activa')
    .order('codigo');

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Nuevo esquejado</h1>
      <p className="text-sm text-neutral-500 mb-6">
        El código ESQ- se genera automáticamente. Registra cuántos esquejes sacaste hoy; el resultado de
        enraizamiento se completa después, desde la ficha del esquejado.
      </p>

      <form action={crearEsqueje} className="card p-6 space-y-4 max-w-2xl">
        {searchParams?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {searchParams.error}
          </p>
        )}

        <div>
          <label className="label" htmlFor="madre_id">Planta madre de origen (opcional)</label>
          <select className="input" id="madre_id" name="madre_id" defaultValue={searchParams?.madre_id ?? ''}>
            <option value="">— Sin madre específica —</option>
            {(madres ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.codigo} — {m.variedad}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-400 mt-1">
            Si eliges una madre, la variedad, el banco de semillas y el % THC/CBD de abajo se ignoran: se
            copian solos desde la ficha de la madre (el esqueje es genéticamente idéntico a ella).
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="variedad">
              Variedad <span className="text-red-500">*</span>
            </label>
            <input className="input" id="variedad" name="variedad" required />
          </div>
          <div>
            <label className="label" htmlFor="fecha">Fecha</label>
            <input
              className="input"
              id="fecha"
              name="fecha"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="banco_semillas">Banco de semillas (marca)</label>
          <input className="input" id="banco_semillas" name="banco_semillas" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="thc_pct">% THC</label>
            <input className="input" id="thc_pct" name="thc_pct" type="number" step="0.01" />
          </div>
          <div>
            <label className="label" htmlFor="cbd_pct">% CBD</label>
            <input className="input" id="cbd_pct" name="cbd_pct" type="number" step="0.01" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="cantidad_realizados">
            Cantidad de esquejes realizados <span className="text-red-500">*</span>
          </label>
          <input className="input" id="cantidad_realizados" name="cantidad_realizados" type="number" required />
        </div>

        <div>
          <label className="label" htmlFor="observaciones">Observaciones</label>
          <textarea className="input" id="observaciones" name="observaciones" rows={3} />
        </div>

        <button type="submit" className="btn-primary">
          Guardar esquejado
        </button>
      </form>
    </div>
  );
}
