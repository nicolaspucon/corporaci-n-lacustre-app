import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';

export default async function PlantasPage({ searchParams }: { searchParams?: { ver?: string } }) {
  await requireStaff();
  const supabase = createClient();
  const verAnulados = searchParams?.ver === 'anulados';

  const query = supabase
    .from('plantas')
    .select('id, codigo, variedad, estado_sanitario, fecha_cosecha, produccion_esperada_g, banco_semillas, thc_pct, cbd_pct, ubicacion, lote:lotes(codigo)')
    .order('codigo', { ascending: false })
    .limit(500);
  if (verAnulados) query.not('anulado_en', 'is', null);
  else query.is('anulado_en', null);

  const { data, error } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">
          Plantas{verAnulados && <span className="text-neutral-400 font-normal"> — anuladas</span>}
        </h1>
        <div className="flex gap-3">
          <Link href={verAnulados ? '/agricola/plantas' : '/agricola/plantas?ver=anulados'} className="btn-secondary">
            {verAnulados ? 'Ver vigentes' : 'Ver anuladas'}
          </Link>
          <a href="/agricola/plantas/exportar" className="btn-secondary">
            Descargar Excel
          </a>
          {!verAnulados && (
            <Link href="/agricola/plantas/nuevo" className="btn-primary">
              + Nueva planta
            </Link>
          )}
        </div>
      </div>
      <p className="text-sm text-neutral-500 mb-6">Manual Interno 5.4 / 5.5 — código individual CP-</p>

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
              <th>Lote</th>
              <th>Variedad</th>
              <th>Banco semillas</th>
              <th>% THC</th>
              <th>% CBD</th>
              <th>Estado sanitario</th>
              <th>Cosecha estimada</th>
              <th>Producción esperada</th>
              <th>Ubicación</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={11} className="text-center text-neutral-500 py-8">
                  {verAnulados ? 'Sin plantas anuladas.' : 'Sin plantas registradas todavía.'}
                </td>
              </tr>
            )}
            {(data ?? []).map((p: any) => (
              <tr key={p.id}>
                <td>{p.codigo}</td>
                <td>{p.lote?.codigo ?? '—'}</td>
                <td>{p.variedad ?? '—'}</td>
                <td>{p.banco_semillas ?? '—'}</td>
                <td>{p.thc_pct ?? '—'}</td>
                <td>{p.cbd_pct ?? '—'}</td>
                <td>{p.estado_sanitario ?? '—'}</td>
                <td>{p.fecha_cosecha ?? '—'}</td>
                <td>{p.produccion_esperada_g ? `${p.produccion_esperada_g} g` : '—'}</td>
                <td>{p.ubicacion ?? '—'}</td>
                <td>
                  <Link href={`/agricola/plantas/${p.id}`} className="text-brand underline">
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
