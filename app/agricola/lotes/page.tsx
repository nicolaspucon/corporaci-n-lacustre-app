import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';

export default async function LotesPage({ searchParams }: { searchParams?: { ver?: string } }) {
  await requireStaff();
  const supabase = createClient();
  const verAnulados = searchParams?.ver === 'anulados';

  const query = supabase
    .from('lotes')
    .select('id, codigo, fecha_inicio, cultivo_genetica, n_plantas, estado')
    .order('codigo', { ascending: false })
    .limit(300);
  if (verAnulados) query.not('anulado_en', 'is', null);
  else query.is('anulado_en', null);

  const { data, error } = await query;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">
          Lotes{verAnulados && <span className="text-neutral-400 font-normal"> — anulados</span>}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href={verAnulados ? '/agricola/lotes' : '/agricola/lotes?ver=anulados'} className="btn-secondary">
            {verAnulados ? 'Ver vigentes' : 'Ver anulados'}
          </Link>
          <a href="/agricola/lotes/exportar" className="btn-secondary">
            Descargar Excel
          </a>
          {!verAnulados && (
            <Link href="/agricola/lotes/nuevo" className="btn-primary">
              + Nuevo lote
            </Link>
          )}
        </div>
      </div>
      <p className="text-sm text-neutral-500 mb-6">Manual Interno 5.5 / 6.5</p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      {(data ?? []).length === 0 ? (
        <div className="card p-8 text-center text-neutral-500 text-sm">
          {verAnulados ? 'Sin lotes anulados.' : 'Sin lotes registrados todavía.'}
        </div>
      ) : (
        <>
          {/* Móvil: tarjetas apiladas */}
          <div className="md:hidden space-y-3">
            {(data ?? []).map((l) => (
              <Link key={l.id} href={`/agricola/lotes/${l.id}`} className="mobile-list-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-brand">{l.codigo}</p>
                  <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 rounded-full px-2.5 py-1 capitalize">
                    {l.estado}
                  </span>
                </div>
                <dl className="space-y-0.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Genética</dt>
                    <dd className="text-right">{l.cultivo_genetica ?? '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Inicio</dt>
                    <dd className="text-right">{l.fecha_inicio}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">N° plantas</dt>
                    <dd className="text-right">{l.n_plantas ?? '—'}</dd>
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
                  <th>Inicio</th>
                  <th>Genética</th>
                  <th>N° plantas</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((l) => (
                  <tr key={l.id}>
                    <td>{l.codigo}</td>
                    <td>{l.fecha_inicio}</td>
                    <td>{l.cultivo_genetica ?? '—'}</td>
                    <td>{l.n_plantas ?? '—'}</td>
                    <td className="capitalize">{l.estado}</td>
                    <td>
                      <Link href={`/agricola/lotes/${l.id}`} className="text-brand underline">
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
