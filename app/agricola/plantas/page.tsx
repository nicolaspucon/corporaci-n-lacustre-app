import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';

export default async function PlantasPage({ searchParams }: { searchParams?: { ver?: string } }) {
  await requireStaff();
  const supabase = createClient();
  const verAnulados = searchParams?.ver === 'anulados';

  const query = supabase
    .from('plantas')
    .select('id, codigo, variedad, estado_sanitario, fecha_cosecha, produccion_esperada_g, banco_semillas, thc_pct, cbd_pct, ubicacion, lote:lotes(codigo)')
    .order('codigo', { ascending: false })
    .limit(500);
  if (verAnulados) query.not('anulado_en', 'is', null);
  else query.is('anulado_en', null);

  const { data, error } = await query;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">
          Plantas{verAnulados && <span className="text-neutral-400 font-normal"> — anuladas</span>}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href={verAnulados ? '/agricola/plantas' : '/agricola/plantas?ver=anulados'} className="btn-secondary">
            {verAnulados ? 'Ver vigentes' : 'Ver anuladas'}
          </Link>
          <a href="/agricola/plantas/exportar" className="btn-secondary">
            Descargar Excel
          </a>
          {!verAnulados && (
            <Link href="/agricola/plantas/nuevo" className="btn-primary">
              + Nueva planta
            </Link>
          )}
        </div>
      </div>
      <p className="text-sm text-neutral-500 mb-6">Manual Interno 5.4 / 5.5 — código individual CP-</p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      {(data ?? []).length === 0 ? (
        <div className="card p-8 text-center text-neutral-500 text-sm">
          {verAnulados ? 'Sin plantas anuladas.' : 'Sin plantas registradas todavía.'}
        </div>
      ) : (
        <>
          {/* Móvil: tarjetas apiladas */}
          <div className="md:hidden space-y-3">
            {(data ?? []).map((p: any) => (
              <Link key={p.id} href={`/agricola/plantas/${p.id}`} className="mobile-list-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-brand">{p.codigo}</p>
                  <span className="text-xs text-neutral-500">{p.lote?.codigo ?? 'sin lote'}</span>
                </div>
                <dl className="space-y-0.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Variedad</dt>
                    <dd className="text-right">{p.variedad ?? '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Banco semillas</dt>
                    <dd className="text-right">{p.banco_semillas ?? '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">% THC / % CBD</dt>
                    <dd className="text-right">{p.thc_pct ?? '—'} / {p.cbd_pct ?? '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Estado sanitario</dt>
                    <dd className="text-right">{p.estado_sanitario ?? '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Cosecha estimada</dt>
                    <dd className="text-right">{p.fecha_cosecha ?? '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Producción esperada</dt>
                    <dd className="text-right">{p.produccion_esperada_g ? `${p.produccion_esperada_g} g` : '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Ubicación</dt>
                    <dd className="text-right">{p.ubicacion ?? '—'}</dd>
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
                  <th>Lote</th>
                  <th>Variedad</th>
                  <th>Banco semillas</th>
                  <th>% THC</th>
                  <th>% CBD</th>
                  <th>Estado sanitario</th>
                  <th>Cosecha estimada</th>
                  <th>Producción esperada</th>
                  <th>Ubicación</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((p: any) => (
                  <tr key={p.id}>
                    <td>{p.codigo}</td>
                    <td>{p.lote?.codigo ?? '—'}</td>
                    <td>{p.variedad ?? '—'}</td>
                    <td>{p.banco_semillas ?? '—'}</td>
                    <td>{p.thc_pct ?? '—'}</td>
                    <td>{p.cbd_pct ?? '—'}</td>
                    <td>{p.estado_sanitario ?? '—'}</td>
                    <td>{p.fecha_cosecha ?? '—'}</td>
                    <td>{p.produccion_esperada_g ? `${p.produccion_esperada_g} g` : '—'}</td>
                    <td>{p.ubicacion ?? '—'}</td>
                    <td>
                      <Link href={`/agricola/plantas/${p.id}`} className="text-brand underline">
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
