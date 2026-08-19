import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEntity, getResponsableColumn } from '@/lib/entities';

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const entity = getEntity(params.slug);
  if (!entity) {
    return new NextResponse('Tipo de registro no encontrado.', { status: 404 });
  }

  const supabase = createClient();

  const relations: string[] = [];
  if (entity.fields.some((f) => f.type === 'lote')) relations.push('lote:lotes(codigo)');
  if (entity.fields.some((f) => f.type === 'planta')) relations.push('planta:plantas(codigo)');
  const responsableCol = getResponsableColumn(entity);
  if (responsableCol) relations.push(`resp_join:profiles!${responsableCol}(nombre_completo)`);
  const selectStr = ['*', ...relations].join(', ');

  const query = supabase.from(entity.table).select(selectStr);
  if (entity.orderBy) query.order(entity.orderBy, { ascending: false });
  const { data, error } = await query.limit(5000);

  if (error) {
    return new NextResponse(`Error al exportar: ${error.message}`, { status: 500 });
  }

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

  const camposVisibles = entity.fields.filter((f) => f.type !== 'photo');
  const headers = [
    ...camposVisibles.map((f) => f.label),
    ...(entity.fields.some((f) => f.type === 'photo') ? ['Fotografía'] : []),
    ...(responsableCol ? ['Registrado por'] : []),
    'Firmado',
  ];

  const lines = [headers.map(csvEscape).join(',')];

  for (const row of rows) {
    const cells: unknown[] = camposVisibles.map((f) => {
      if (f.type === 'lote' || f.type === 'planta') return row[f.key]?.codigo ?? '';
      if (f.type === 'boolean') return row[f.key] ? 'Sí' : 'No';
      return row[f.key];
    });
    const fotoField = entity.fields.find((f) => f.type === 'photo');
    if (fotoField) {
      cells.push(row[`${fotoField.key}_path`] ? 'Con fotografía' : 'Sin fotografía');
    }
    if (responsableCol) {
      cells.push(row.resp_join?.nombre_completo ?? '');
    }
    cells.push(firmados.has(row.id) ? 'Sí' : 'No');
    lines.push(cells.map(csvEscape).join(','));
  }

  const csv = '\uFEFF' + lines.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entity.slug}.csv"`,
    },
  });
}
