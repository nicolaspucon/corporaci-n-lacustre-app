import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { actualizarPlanta } from '@/lib/actions/agricola';
import { notFound } from 'next/navigation';

export default async function PlantaDetallePage({ params }: { params: { id: string } }) {
  await requireStaff();
  const supabase = createClient();

  const { data: planta } = await supabase
    .from('plantas')
    .select('*, lote:lotes(codigo, cultivo_genetica)')
    .eq('id', params.id)
    .single();

  if (!planta) notFound();

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
      </div>

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
          <label className="label" htmlFor="observaciones">Observaciones</label>
          <textarea className="input" id="observaciones" name="observaciones" rows={4} defaultValue={planta.observaciones ?? ''} />
        </div>

        <button type="submit" className="btn-primary">
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
