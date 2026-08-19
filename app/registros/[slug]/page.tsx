import { createClient } from '@/lib/supabase/server';
import { getEntity, getResponsableColumn, ENTITIES } from '@/lib/entities';
import { calcularPlantasActivas } from '@/lib/plantasActivas';
import { calcularStockInventario } from '@/lib/inventario';
import DataTable from '@/components/DataTable';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return ENTITIES.map((e) => ({ slug: e.slug }));
}

export default async function RegistroListPage({ params }: { params: { slug: string } }) {
  const entity = getEntity(params.slug);
  if (!entity) notFound();

  const supabase = createClient();

  const relations: string[] = [];
  if (entity.fields.some((f) => f.type === 'lote')) relations.push('lote:lotes(codigo)');
  if (entity.fields.some((f) => f.type === 'planta')) relations.push('planta:plantas(codigo)');
  const responsableCol = getResponsableColumn(entity);
  if (responsableCol) relations.push(`resp_join:profiles!${responsableCol}(nombre_completo)`);
  const selectStr = ['*', ...relations].join(', ');

  const query = supabase.from(entity.table).select(selectStr);
  if (entity.orderBy) query.order(entity.orderBy, { ascending: false });

  const { data, error } = await query.limit(200);

  const rows = (data as any[]) ?? [];

  let firmados = new Set<string>();
  if (rows.length > 0) {
    const { data: firmas } = await supabase
      .from('firmas')
      .select('referencia_id')
      .eq('contexto', entity.table)
      .in(
        'referencia_id',
        rows.map((r) => r.id)
      );
    firmados = new Set((firmas ?? []).map((f: any) => f.referencia_id));
  }

  const rowsConFirma = rows.map((r) => ({ ...r, _firmado: firmados.has(r.id) ? 'Sí' : 'No' }));

  const columns = [
    ...entity.fields
      .filter((f) => f.type !== 'photo')
      .map((f) => ({ key: f.key, label: f.label })),
    ...(responsableCol ? [{ key: 'resp_join', label: 'Registrado por' }] : []),
    { key: '_firmado', label: 'Firmado' },
  ];

  const resumenPlantasActivas =
    entity.slug === 'plantas-activas' ? await calcularPlantasActivas(supabase) : null;
  const resumenStock = entity.slug === 'inventario' ? await calcularStockInventario(supabase) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">{entity.label}</h1>
        <div className="flex gap-3">
          <a href={`/registros/${entity.slug}/exportar`} className="btn-secondary">
            Descargar Excel
          </a>
          <Link href={`/registros/${entity.slug}/nuevo`} className="btn-primary">
            + Nuevo registro
          </Link>
        </div>
      </div>
      <p className="text-sm text-neutral-500 mb-6">{entity.manualRef}</p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      {resumenPlantasActivas && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-brand mb-1">Conteo automático — ahora mismo</h2>
          <p className="text-xs text-neutral-500 mb-4">
            Calculado solo a partir de lotes, madres y esquejes existentes (no requiere contar a mano). Al
            crear un nuevo registro, estos valores se prellenan automáticamente.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-md border border-neutral-200 p-4">
              <p className="text-2xl font-bold text-brand">{resumenPlantasActivas.enraizado.total}</p>
              <p className="text-xs text-neutral-500 mt-1">
                Enraizado ({resumenPlantasActivas.enraizado.esquejes} esquejes + {resumenPlantasActivas.enraizado.germinacionLotes} germinación)
              </p>
            </div>
            <div className="rounded-md border border-neutral-200 p-4">
              <p className="text-2xl font-bold text-brand">{resumenPlantasActivas.crecimiento.total}</p>
              <p className="text-xs text-neutral-500 mt-1">
                Crecimiento ({resumenPlantasActivas.crecimiento.madres} madres + {resumenPlantasActivas.crecimiento.lotes} vegetación)
              </p>
            </div>
            <div className="rounded-md border border-neutral-200 p-4">
              <p className="text-2xl font-bold text-brand">{resumenPlantasActivas.floracion.total}</p>
              <p className="text-xs text-neutral-500 mt-1">Floración</p>
            </div>
            <div className="rounded-md border border-brand bg-brand-pale p-4">
              <p className="text-2xl font-bold text-brand">{resumenPlantasActivas.totalActivas}</p>
              <p className="text-xs text-neutral-500 mt-1">Total plantas activas</p>
            </div>
          </div>
          <div className="flex gap-6 mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
            <span>Cosechadas / en procesado (acumulado): <strong className="text-neutral-700">{resumenPlantasActivas.procesadoAcumulado}</strong></span>
            <span>Mermas de esquejes (acumulado): <strong className="text-neutral-700">{resumenPlantasActivas.mermasAcumuladas}</strong></span>
          </div>
        </div>
      )}

      {resumenStock && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-brand">Stock disponible — ahora mismo</h2>
            <p className="text-2xl font-bold text-brand">{resumenStock.totalDisponible} g</p>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            Calculado a partir de los movimientos: las entradas se generan solas al terminar el Curado de un
            lote, y las salidas se descuentan solas al crear una Entrega. No requiere llevar el saldo a mano.
          </p>
          {resumenStock.porLote.length === 0 ? (
            <p className="text-sm text-neutral-400">Todavía no hay movimientos de inventario.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th>Lote</th>
                    <th>Variedad</th>
                    <th>Entradas (g)</th>
                    <th>Salidas (g)</th>
                    <th>Ajustes (g)</th>
                    <th>Stock disponible (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenStock.porLote.map((l) => (
                    <tr key={l.loteId ?? l.codigo}>
                      <td>{l.codigo}</td>
                      <td>{l.variedad ?? '—'}</td>
                      <td>{l.entradas}</td>
                      <td>{l.salidas}</td>
                      <td>{l.ajustes}</td>
                      <td className="font-semibold text-brand">{l.saldo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rowsConFirma}
        linkTo={(row) => `/registros/${entity.slug}/${row.id}`}
      />
    </div>
  );
}
