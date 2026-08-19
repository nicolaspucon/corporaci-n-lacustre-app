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
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">Entregas de suministro</h1>
        {isStaff && (
          <Link href="/suministracion/entregas/nuevo" className="btn-primary">
            + Nueva entrega
          </Link>
        )}
      </div>
      <p className="text-sm text-neutral-500 mb-6">Manual Interno Cap. VIII — código EN-</p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      <div className="card overflow-x-auto">
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
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={isStaff ? 6 : 5} className="text-center text-neutral-500 py-8">
                  Sin entregas registradas todavía.
                </td>
              </tr>
            )}
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
    </div>
  );
}
