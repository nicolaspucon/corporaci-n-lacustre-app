import { createClient } from '@/lib/supabase/server';
import { getEntity, ENTITIES } from '@/lib/entities';
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
  const selectStr = ['*', ...relations].join(', ');

  const query = supabase.from(entity.table).select(selectStr);
  if (entity.orderBy) query.order(entity.orderBy, { ascending: false });

  const { data, error } = await query.limit(200);

  const columns = entity.fields.map((f) => ({ key: f.key === 'lote' || f.key === 'planta' ? f.key : f.key, label: f.label }));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">{entity.label}</h1>
        <Link href={`/registros/${entity.slug}/nuevo`} className="btn-primary">
          + Nuevo registro
        </Link>
      </div>
      <p className="text-sm text-neutral-500 mb-6">{entity.manualRef}</p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      <DataTable columns={columns} rows={(data as any) ?? []} />
    </div>
  );
}
