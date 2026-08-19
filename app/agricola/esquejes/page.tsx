import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';

const ESTADO_LABELS: Record<string, string> = {
  enraizamiento: 'En enraizamiento',
  listo: 'Listo para vegetación',
  pasado_a_lote: 'Pasado a lote',
  descartado: 'Descartado',
};

export default async function EsquejesPage() {
  await requireStaff();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('esquejes')
    .select('id, codigo, variedad, fecha, cantidad_realizados, cantidad_enraizadas, cantidad_perdidas, estado, lote:lotes(codigo)')
    .order('fecha', { ascending: false })
    .limit(500);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">Esquejes (propagación)</h1>
        <Link href="/agricola/esquejes/nuevo" className="btn-primary">
          + Nuevo esquejado
        </Link>
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

      <div className="card overflow-x-auto">
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
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-neutral-500 py-8">
                  Sin esquejados registrados todavía.
                </td>
              </tr>
            )}
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
    </div>
  );
}
