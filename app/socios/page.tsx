import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';

export default async function SociosPage({ searchParams }: { searchParams?: { ver?: string } }) {
  await requireStaff();
  const supabase = createClient();
  const verAnulados = searchParams?.ver === 'anulados';

  const query = supabase
    .from('socios')
    .select('id, cus, nombre_completo, rut, categoria, estado, fecha_ingreso')
    .order('cus', { ascending: false })
    .limit(500);
  if (verAnulados) query.not('anulado_en', 'is', null);
  else query.is('anulado_en', null);

  const { data, error } = await query;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">
          Registro Maestro de Socios{verAnulados && <span className="text-neutral-400 font-normal"> — anulados</span>}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href={verAnulados ? '/socios' : '/socios?ver=anulados'} className="btn-secondary">
            {verAnulados ? 'Ver vigentes' : 'Ver anulados'}
          </Link>
          {!verAnulados && (
            <Link href="/socios/nuevo" className="btn-primary">
              + Nuevo socio
            </Link>
          )}
        </div>
      </div>
      <p className="text-sm text-neutral-500 mb-6">Manual Interno 4.15</p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      {(data ?? []).length === 0 ? (
        <div className="card p-8 text-center text-neutral-500 text-sm">
          {verAnulados ? 'Sin socios anulados.' : 'Sin socios registrados todavía.'}
        </div>
      ) : (
        <>
          {/* Móvil: tarjetas apiladas */}
          <div className="md:hidden space-y-3">
            {(data ?? []).map((s) => (
              <Link key={s.id} href={`/socios/${s.id}`} className="mobile-list-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-brand">{s.nombre_completo}</p>
                  <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 rounded-full px-2.5 py-1 capitalize">
                    {s.estado}
                  </span>
                </div>
                <dl className="space-y-0.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">CUS</dt>
                    <dd className="text-right">{s.cus}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">RUT</dt>
                    <dd className="text-right">{s.rut ?? '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Categoría</dt>
                    <dd className="text-right capitalize">{s.categoria}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Fecha ingreso</dt>
                    <dd className="text-right">{s.fecha_ingreso}</dd>
                  </div>
                </dl>
                <p className="text-brand text-sm mt-2 font-medium">Ver ficha →</p>
              </Link>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block card overflow-x-auto">
            <table className="data-table w-full border-collapse">
              <thead>
                <tr>
                  <th>CUS</th>
                  <th>Nombre completo</th>
                  <th>RUT</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Fecha ingreso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((s) => (
                  <tr key={s.id}>
                    <td>{s.cus}</td>
                    <td>{s.nombre_completo}</td>
                    <td>{s.rut ?? '—'}</td>
                    <td className="capitalize">{s.categoria}</td>
                    <td className="capitalize">{s.estado}</td>
                    <td>{s.fecha_ingreso}</td>
                    <td>
                      <Link href={`/socios/${s.id}`} className="text-brand underline">
                        Ver ficha
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
