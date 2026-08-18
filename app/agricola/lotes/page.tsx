import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';

export default async function LotesPage() {
  await requireStaff();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('lotes')
    .select('id, codigo, fecha_inicio, cultivo_genetica, n_plantas, estado')
    .order('codigo', { ascending: false })
    .limit(300);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">Lotes</h1>
        <Link href="/agricola/lotes/nuevo" className="btn-primary">
          + Nuevo lote
        </Link>
      </div>
      <p className="text-sm text-neutral-500 mb-6">Manual Interno 5.5 / 6.5</p>

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
              <th>Inicio</th>
              <th>Genética</th>
              <th>N° plantas</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-neutral-500 py-8">
                  Sin lotes registrados todavía.
                </td>
              </tr>
            )}
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
    </div>
  );
}
