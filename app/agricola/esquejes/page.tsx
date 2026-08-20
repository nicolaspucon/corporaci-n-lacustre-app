import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';

const ESTADO_LABELS: Record<string, string> = {
  enraizamiento: 'En enraizamiento',
  listo: 'Listo para vegetación',
  pasado_a_lote: 'Pasado a lote',
  descartado: 'Descartado',
};

export default async function EsquejesPage({ searchParams }: { searchParams?: { ver?: string } }) {
  await requireStaff();
  const supabase = createClient();
  const verAnulados = searchParams?.ver === 'anulados';

  const query = supabase
    .from('esquejes')
    .select('id, codigo, variedad, fecha, cantidad_realizados, cantidad_enraizadas, cantidad_perdidas, estado, lote:lotes(codigo)')
    .order('fecha', { ascending: false })
    .limit(500);
  if (verAnulados) query.not('anulado_en', 'is', null);
  else query.is('anulado_en', null);

  const { data, error } = await query;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">
          Esquejes (propagación){verAnulados && <span className="text-neutral-400 font-normal"> — anulados</span>}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href={verAnulados ? '/agricola/esquejes' : '/agricola/esquejes?ver=anulados'} className="btn-secondary">
            {verAnulados ? 'Ver vigentes' : 'Ver anulados'}
          </Link>
          <a href="/agricola/esquejes/exportar" className="btn-secondary">
            Descargar Excel
          </a>
          {!verAnulados && (
            <Link href="/agricola/esquejes/nuevo" className="btn-primary">
              + Nuevo esquejado
            </Link>
          )}
        </div>
      </div>
      <p className="text-sm text-neutral-500 mb-6">
        Planilla de esquejado: cuántas unidades se sacaron por variedad y cuántas enraizaron sanas. Todavía no
        son un lote — pasan a vegetación una vez seleccionadas.
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      {(data ?? []).length === 0 ? (
        <div className="card p-8 text-center text-neutral-500 text-sm">
          {verAnulados ? 'Sin esquejados anulados.' : 'Sin esquejados registrados todavía.'}
        </div>
      ) : (
        <>
          {/* Móvil: tarjetas apiladas */}
          <div className="md:hidden space-y-3">
            {(data ?? []).map((e: any) => (
              <Link key={e.id} href={`/agricola/esquejes/${e.id}`} className="mobile-list-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-brand">{e.codigo}</p>
                  <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 rounded-full px-2.5 py-1">
                    {ESTADO_LABELS[e.estado] ?? e.estado}
                  </span>
                </div>
                <dl className="space-y-0.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Variedad</dt>
                    <dd className="text-right">{e.variedad}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Fecha</dt>
                    <dd className="text-right">{e.fecha}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Realizados / Enraizados / Perdidos</dt>
                    <dd className="text-right">{e.cantidad_realizados} / {e.cantidad_enraizadas ?? '—'} / {e.cantidad_perdidas ?? '—'}</dd>
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
                  <th>Fecha</th>
                  <th>Realizados</th>
                  <th>Enraizados</th>
                  <th>Perdidos</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((e: any) => (
                  <tr key={e.id}>
                    <td>{e.codigo}</td>
                    <td>{e.variedad}</td>
                    <td>{e.fecha}</td>
                    <td>{e.cantidad_realizados}</td>
                    <td>{e.cantidad_enraizadas ?? '—'}</td>
                    <td>{e.cantidad_perdidas ?? '—'}</td>
                    <td>{ESTADO_LABELS[e.estado] ?? e.estado}</td>
                    <td>
                      <Link href={`/agricola/esquejes/${e.id}`} className="text-brand underline">
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
