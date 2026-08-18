import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import DataTable from '@/components/DataTable';
import Link from 'next/link';

export default async function SociosPage() {
  await requireStaff();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('socios')
    .select('id, cus, nombre_completo, rut, categoria, estado, fecha_ingreso')
    .order('cus', { ascending: false })
    .limit(500);

  const rows = (data ?? []).map((s) => ({
    ...s,
    nombre_completo: { toString: () => s.nombre_completo } as any,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">Registro Maestro de Socios</h1>
        <Link href="/socios/nuevo" className="btn-primary">
          + Nuevo socio
        </Link>
      </div>
      <p className="text-sm text-neutral-500 mb-6">Manual Interno 4.15</p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      <div className="card overflow-x-auto">
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
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-neutral-500 py-8">
                  Sin socios registrados todavía.
                </td>
              </tr>
            )}
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
    </div>
  );
}
