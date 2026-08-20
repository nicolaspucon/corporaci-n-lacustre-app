import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const STAFF = ['admin', 'directorio', 'secretaria', 'direccion_tecnica'];

export default async function EntregasPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');
  const isStaff = STAFF.includes(profile.rol);
  const supabase = createClient();

  const query = supabase
    .from('entregas')
    .select('id, codigo, fecha_hora, cantidad_g, socio:socios(cus, nombre_completo), lote:lotes(codigo, cultivo_genetica)')
    .order('fecha_hora', { ascending: false })
    .limit(300);
  if (!isStaff && profile.socio_id) query.eq('socio_id', profile.socio_id);

  const { data, error } = await query;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">Entregas de suministro</h1>
        {isStaff && (
          <div className="flex flex-wrap gap-2">
            <a href="/suministracion/entregas/exportar" className="btn-secondary">
              Descargar Excel
            </a>
            <Link href="/suministracion/entregas/nuevo" className="btn-primary">
              + Nueva entrega
            </Link>
          </div>
        )}
      </div>
      <p className="text-sm text-neutral-500 mb-6">Manual Interno Cap. VIII — código EN-</p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      {(data ?? []).length === 0 ? (
        <div className="card p-8 text-center text-neutral-500 text-sm">Sin entregas registradas todavía.</div>
      ) : (
        <>
          {/* Móvil: tarjetas apiladas */}
          <div className="md:hidden space-y-3">
            {(data ?? []).map((e: any) => (
              <Link key={e.id} href={`/suministracion/entregas/${e.id}`} className="mobile-list-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-brand">{e.codigo}</p>
                  <span className="text-xs text-neutral-500">{e.cantidad_g ?? '—'} g</span>
                </div>
                <dl className="space-y-0.5 text-sm">
                  {isStaff && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-neutral-500 shrink-0">Socio</dt>
                      <dd className="text-right">{e.socio?.cus} — {e.socio?.nombre_completo}</dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Fecha</dt>
                    <dd className="text-right">{new Date(e.fecha_hora).toLocaleString('es-CL')}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Lote</dt>
                    <dd className="text-right">{e.lote?.codigo ?? '—'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Variedad</dt>
                    <dd className="text-right">{e.lote?.cultivo_genetica ?? '—'}</dd>
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
                  <th>Fecha</th>
                  {isStaff && <th>Socio</th>}
                  <th>Lote</th>
                  <th>Variedad</th>
                  <th>Cantidad (g)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((e: any) => (
                  <tr key={e.id}>
                    <td>{e.codigo}</td>
                    <td>{new Date(e.fecha_hora).toLocaleString('es-CL')}</td>
                    {isStaff && <td>{e.socio?.cus} — {e.socio?.nombre_completo}</td>}
                    <td>{e.lote?.codigo ?? '—'}</td>
                    <td>{e.lote?.cultivo_genetica ?? '—'}</td>
                    <td>{e.cantidad_g ?? '—'}</td>
                    <td><Link href={`/suministracion/entregas/${e.id}`} className="text-brand underline">Ver</Link></td>
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
