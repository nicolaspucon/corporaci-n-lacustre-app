import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET() {
  await requireStaff();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('lotes')
    .select('*, anulador:profiles!anulado_por(nombre_completo)')
    .order('codigo', { ascending: false })
    .limit(5000);

  if (error) {
    return new NextResponse(`Error al exportar: ${error.message}`, { status: 500 });
  }

  const rows = (data as any[]) ?? [];

  const headers = [
    'Código',
    'Genética / cultivo',
    'Banco de semillas',
    '% THC',
    '% CBD',
    'Área (m²)',
    'N.º plantas planificadas',
    'Fecha de inicio',
    'Estado',
    'Evaluación final',
    'Fecha de cierre',
    'Estado registro',
    'Anulado el',
    'Anulado por',
    'Motivo de anulación',
  ];

  const lines = [headers.map(csvEscape).join(',')];

  for (const r of rows) {
    lines.push(
      [
        r.codigo,
        r.cultivo_genetica,
        r.banco_semillas,
        r.thc_pct,
        r.cbd_pct,
        r.area_m2,
        r.n_plantas,
        r.fecha_inicio,
        r.estado,
        r.evaluacion_final,
        r.fecha_cierre,
        r.anulado_en ? 'Anulado' : 'Vigente',
        r.anulado_en ? new Date(r.anulado_en).toLocaleString('es-CL') : '',
        r.anulado_en ? r.anulador?.nombre_completo ?? '' : '',
        r.motivo_anulacion ?? '',
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  const csv = '\uFEFF' + lines.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lotes.csv"',
    },
  });
}
