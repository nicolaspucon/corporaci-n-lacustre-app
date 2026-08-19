import { createClient } from '@/lib/supabase/server';
import { getEntity, getResponsableColumn, ENTITIES } from '@/lib/entities';
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

      <DataTable
        columns={columns}
        rows={rowsConFirma}
        linkTo={(row) => `/registros/${entity.slug}/${row.id}`}
      />
    </div>
  );
}
