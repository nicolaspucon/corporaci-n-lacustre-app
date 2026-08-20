import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';

export default async function MadresPage({ searchParams }: { searchParams?: { ver?: string } }) {
  await requireStaff();
  const supabase = createClient();
  const verAnulados = searchParams?.ver === 'anulados';

  const query = supabase
    .from('plantas_madre')
    .select('id, codigo, variedad, fecha_inicio, estado, ubicacion')
    .order('codigo', { ascending: false })
    .limit(500);
  if (verAnulados) query.not('anulado_en', 'is', null);
  else query.is('anulado_en', null);

  const { data, error } = await query;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">
          Plantas madre{verAnulados && <span className="text-neutral-400 font-normal"> — anuladas</span>}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href={verAnulados ? '/agricola/madres' : '/agricola/madres?ver=anulados'} className="btn-secondary">
            {verAnulados ? 'Ver vigentes' : 'Ver anuladas'}
          </Link>
          <a href="/agricola/madres/exportar" className="btn-secondary">
            Descargar Excel
          </a>
          {!verAnulados && (
            <Link href="/agricola/madres/nuevo" className="btn-primary">
              + Nueva madre
            </Link>
          )}
        </div>
      </div>
      <p className="text-sm text-neutral-500 mb-6">
        Plantas mantenidas en vegetativo permanente para extraer esquejes — no pertenecen a un lote.
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      {(data ?? []).length === 0 ? (
        <div className="card p-8 text-center text-neutral-500 text-sm">
          {verAnulados ? 'Sin plantas madre anuladas.' : 'Sin plantas madre registradas todavía.'}
        </div>
      ) : (
        <>
          {/* Móvil: tarjetas apiladas */}
          <div className="md:hidden space-y-3">
            {(data ?? []).map((m) => (
              <Link key={m.id} href={`/agricola/madres/${m.id}`} className="mobile-list-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-brand">{m.codigo}</p>
                  <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 rounded-full px-2.5 py-1 capitalize">
                    {m.estado}
                  </span>
                </div>
                <dl className="space-y-0.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Variedad</dt>
                    <dd className="text-right">{m.variedad}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Fecha de inicio</dt>
                    <dd className="text-right">{m.fecha_inicio}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Ubicación</dt>
                    <dd className="text-right">{m.ubicacion ?? '—'}</dd>
                  </div>
                </dl>
                <p className="text-brand text-sm mt-2 font-medium">Ver →</p>
              </Link>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block card overflow-x-auto">
            <table className="data-table w-full border-collapse">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Variedad</th>
                  <th>Fecha de inicio</th>
                  <th>Estado</th>
                  <th>Ubicación</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((m) => (
                  <tr key={m.id}>
                    <td>{m.codigo}</td>
                    <td>{m.variedad}</td>
                    <td>{m.fecha_inicio}</td>
                    <td className="capitalize">{m.estado}</td>
                    <td>{m.ubicacion ?? '—'}</td>
                    <td>
                      <Link href={`/agricola/madres/${m.id}`} className="text-brand underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
