import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const STAFF = ['admin', 'directorio', 'secretaria', 'direccion_tecnica'];

export default async function SolicitudesPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');
  const isStaff = STAFF.includes(profile.rol);
  const supabase = createClient();

  const query = supabase
    .from('solicitudes_suministro')
    .select('id, n_control, fecha, tipo_material, cantidad_solicitada_g, resolucion, socio:socios(cus, nombre_completo)')
    .order('fecha', { ascending: false })
    .limit(300);
  if (!isStaff && profile.socio_id) query.eq('socio_id', profile.socio_id);

  const { data, error } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">Solicitudes de suministro</h1>
        <Link href="/suministracion/solicitudes/nuevo" className="btn-primary">
          + Nueva solicitud
        </Link>
      </div>
      <p className="text-sm text-neutral-500 mb-6">Manual Interno Cap. VIII</p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="data-table w-full border-collapse">
          <thead>
            <tr>
              <th>N° control</th>
              <th>Fecha</th>
              {isStaff && <th>Socio</th>}
              <th>Material</th>
              <th>Cantidad (g)</th>
              <th>Resolución</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={isStaff ? 7 : 6} className="text-center text-neutral-500 py-8">
                  Sin solicitudes registradas todavía.
                </td>
              </tr>
            )}
            {(data ?? []).map((s: any) => (
              <tr key={s.id}>
                <td>{s.n_control}</td>
                <td>{s.fecha}</td>
                {isStaff && <td>{s.socio?.cus} — {s.socio?.nombre_completo}</td>}
                <td>{s.tipo_material ?? '—'}</td>
                <td>{s.cantidad_solicitada_g ?? '—'}</td>
                <td className="capitalize">{s.resolucion.replace('_', ' ')}</td>
                <td>
                  {isStaff && (
                    <Link href={`/suministracion/solicitudes/${s.id}`} className="text-brand underline">
                      Resolver
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
