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
      <div className="flex items-center justify-between mb-1">
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

      <div className="card overflow-x-auto">
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
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-neutral-500 py-8">
                  Sin traslados registrados todavía.
                </td>
              </tr>
            )}
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
    </div>
  );
}
