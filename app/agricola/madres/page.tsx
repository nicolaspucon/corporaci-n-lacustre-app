import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';

export default async function MadresPage() {
  await requireStaff();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('plantas_madre')
    .select('id, codigo, variedad, fecha_inicio, estado, ubicacion')
    .order('codigo', { ascending: false })
    .limit(500);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">Plantas madre</h1>
        <Link href="/agricola/madres/nuevo" className="btn-primary">
          + Nueva madre
        </Link>
      </div>
      <p className="text-sm text-neutral-500 mb-6">
        Plantas mantenidas en vegetativo permanente para extraer esquejes — no pertenecen a un lote.
      </p>

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
              <th>Variedad</th>
              <th>Fecha de inicio</th>
              <th>Estado</th>
              <th>Ubicación</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-neutral-500 py-8">
                  Sin plantas madre registradas todavía.
                </td>
              </tr>
            )}
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
    </div>
  );
}
