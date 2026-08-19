import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { actualizarEstadoMadre } from '@/lib/actions/agricola';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const ESTADOS = ['activa', 'retirada'];

export default async function MadreDetallePage({ params }: { params: { id: string } }) {
  await requireStaff();
  const supabase = createClient();

  const [{ data: madre }, { data: esquejes }] = await Promise.all([
    supabase.from('plantas_madre').select('*').eq('id', params.id).single(),
    supabase
      .from('esquejes')
      .select('id, codigo, fecha, cantidad_realizados, cantidad_enraizadas, estado')
      .eq('madre_id', params.id)
      .order('fecha', { ascending: false }),
  ]);

  if (!madre) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">
          Madre {madre.codigo} <span className="text-neutral-400 font-normal">— {madre.variedad}</span>
        </h1>
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
      </div>

      <div className="card p-5 text-sm space-y-1">
        <p><span className="text-neutral-500">Fecha de inicio:</span> {madre.fecha_inicio}</p>
        <p><span className="text-neutral-500">Ubicación:</span> {madre.ubicacion ?? '—'}</p>
        <p><span className="text-neutral-500">Observaciones:</span> {madre.observaciones ?? '—'}</p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-brand">Esquejes sacados de esta madre</h2>
          <Link href={`/agricola/esquejes/nuevo?madre_id=${madre.id}`} className="btn-secondary text-sm">
            + Nuevo esquejado
          </Link>
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
    </div>
  );
}
