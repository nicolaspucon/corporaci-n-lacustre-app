import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { crearTraslado } from '@/lib/actions/transporte';

export default async function NuevoTrasladoPage({ searchParams }: { searchParams: { error?: string } }) {
  await requireStaff();
  const supabase = createClient();

  const [{ data: lotes }, { data: entregas }] = await Promise.all([
    supabase.from('lotes').select('id, codigo').order('codigo', { ascending: false }),
    supabase.from('entregas').select('id, codigo').order('fecha_hora', { ascending: false }).limit(50),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Nuevo traslado</h1>
      <p className="text-sm text-neutral-500 mb-6">
        El código TR- se genera automáticamente. Registra siempre los documentos que debe portar el
        transportista según el Protocolo de Transporte (Manual 7.17–7.23): autorización interna, cédula del
        conductor, y receta/certificado del socio si corresponde.
      </p>

      <form action={crearTraslado} className="card p-6 space-y-4 max-w-2xl">
        {searchParams?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {searchParams.error}
          </p>
        )}

        <div>
          <label className="label" htmlFor="tipo">Tipo de traslado</label>
          <select className="input" id="tipo" name="tipo" defaultValue="interno">
            <option value="interno">Interno (dentro de la Corporación)</option>
            <option value="externo">Externo (hacia/desde un socio u otro destino)</option>
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="origen">Origen</label>
            <input className="input" id="origen" name="origen" />
          </div>
          <div>
            <label className="label" htmlFor="destino">Destino</label>
            <input className="input" id="destino" name="destino" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="fecha_salida">Fecha y hora de salida</label>
            <input className="input" id="fecha_salida" name="fecha_salida" type="datetime-local" />
          </div>
          <div>
            <label className="label" htmlFor="vehiculo_patente">Patente del vehículo</label>
            <input className="input" id="vehiculo_patente" name="vehiculo_patente" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="lote_id">Lote relacionado</label>
            <select className="input" id="lote_id" name="lote_id">
              <option value="">— Sin asignar —</option>
              {(lotes ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.codigo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="entrega_id">Entrega relacionada</label>
            <select className="input" id="entrega_id" name="entrega_id">
              <option value="">— Sin asignar —</option>
              {(entregas ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.codigo}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="cantidad">Cantidad transportada</label>
          <input className="input" id="cantidad" name="cantidad" placeholder="Ej. 120 g flor seca" />
        </div>

        <div>
          <label className="label" htmlFor="autorizacion">Autorización interna (N° o responsable que autoriza)</label>
          <input className="input" id="autorizacion" name="autorizacion" />
        </div>

        <div>
          <label className="label" htmlFor="observaciones">Observaciones</label>
          <textarea className="input" id="observaciones" name="observaciones" rows={3} />
        </div>

        <button type="submit" className="btn-primary">
          Registrar traslado
        </button>
      </form>
    </div>
  );
}
