import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { crearPlanta } from '@/lib/actions/agricola';

export default async function NuevaPlantaPage({ searchParams }: { searchParams: { error?: string; lote?: string } }) {
  await requireStaff();
  const supabase = createClient();

  const { data: lotes } = await supabase
    .from('lotes')
    .select('id, codigo, cultivo_genetica')
    .not('estado', 'eq', 'cerrado')
    .order('codigo', { ascending: false });

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Registrar planta</h1>
      <p className="text-sm text-neutral-500 mb-6">El código CP- se genera automáticamente (Manual 5.4).</p>

      <form action={crearPlanta} className="card p-6 space-y-4 max-w-2xl">
        {searchParams?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {searchParams.error}
          </p>
        )}

        <div>
          <label className="label" htmlFor="lote_id">Lote</label>
          <select className="input" id="lote_id" name="lote_id" defaultValue={searchParams?.lote ?? ''}>
            <option value="">— Sin asignar —</option>
            {(lotes ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo}{l.cultivo_genetica ? ` — ${l.cultivo_genetica}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="fecha_germinacion">Fecha de germinación</label>
            <input className="input" id="fecha_germinacion" name="fecha_germinacion" type="date" />
          </div>
          <div>
            <label className="label" htmlFor="variedad">Variedad</label>
            <input className="input" id="variedad" name="variedad" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="origen">Origen (semilla / esqueje / madre)</label>
            <input className="input" id="origen" name="origen" />
          </div>
          <div>
            <label className="label" htmlFor="ubicacion">Ubicación</label>
            <input className="input" id="ubicacion" name="ubicacion" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="estado_sanitario">Estado sanitario</label>
          <input className="input" id="estado_sanitario" name="estado_sanitario" defaultValue="sano" />
        </div>

        <div>
          <label className="label" htmlFor="observaciones">Observaciones</label>
          <textarea className="input" id="observaciones" name="observaciones" rows={3} />
        </div>

        <button type="submit" className="btn-primary">
          Guardar planta
        </button>
      </form>
    </div>
  );
}
