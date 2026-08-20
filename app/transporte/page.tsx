import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';

export default async function TransportePage() {
  await requireStaff();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('traslados')
    .select('id, codigo, tipo, fecha_salida, fecha_llegada, origen, destino, vehiculo_patente')
    .order('fecha_salida', { ascending: false })
    .limit(300);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">Traslados</h1>
        <Link href="/transporte/nuevo" className="btn-primary">
          + Nuevo traslado
        </Link>
      </div>
      <p className="text-sm text-neutral-500 mb-6">Protocolo de Transporte — Manual Interno 7.17 a 7.23</p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      {(data ?? []).length === 0 ? (
        <div className="card p-8 text-center text-neutral-500 text-sm">Sin traslados registrados todavía.</div>
      ) : (
        <>
          {/* Móvil: tarjetas apiladas */}
          <div className="md:hidden space-y-3">
            {(data ?? []).map((t) => (
              <Link key={t.id} href={`/transporte/${t.id}`} className="mobile-list-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-brand">{t.codigo}</p>
                  <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 rounded-full px-2.5 py-1 capitalize">
                    {t.tipo}
                  </span>
                </div>
                <dl className="space-y-0.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Origen → Destino</dt>
                    <dd className="text-right">{t.origen ?? '—'} → {t.destino ?? '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Patente</dt>
                    <dd className="text-right">{t.vehiculo_patente ?? '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Salida</dt>
                    <dd className="text-right">{t.fecha_salida ? new Date(t.fecha_salida).toLocaleString('es-CL') : '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Llegada</dt>
                    <dd className="text-right">{t.fecha_llegada ? new Date(t.fecha_llegada).toLocaleString('es-CL') : 'Pendiente'}</dd>
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
                  <th>Tipo</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Patente</th>
                  <th>Salida</th>
                  <th>Llegada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((t) => (
                  <tr key={t.id}>
                    <td>{t.codigo}</td>
                    <td className="capitalize">{t.tipo}</td>
                    <td>{t.origen ?? '—'}</td>
                    <td>{t.destino ?? '—'}</td>
                    <td>{t.vehiculo_patente ?? '—'}</td>
                    <td>{t.fecha_salida ? new Date(t.fecha_salida).toLocaleString('es-CL') : '—'}</td>
                    <td>{t.fecha_llegada ? new Date(t.fecha_llegada).toLocaleString('es-CL') : '—'}</td>
                    <td><Link href={`/transporte/${t.id}`} className="text-brand underline">Ver</Link></td>
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
