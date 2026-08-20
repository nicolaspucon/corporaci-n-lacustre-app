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
    .from('entregas')
    .select(
      '*, socio:socios(cus, nombre_completo), lote:lotes(codigo, cultivo_genetica, banco_semillas, thc_pct, cbd_pct), responsable:profiles!responsable_entrega(nombre_completo), solicitud:solicitudes_suministro(n_control)'
    )
    .order('fecha_hora', { ascending: false })
    .limit(5000);

  if (error) {
    return new NextResponse(`Error al exportar: ${error.message}`, { status: 500 });
  }

  const rows = (data as any[]) ?? [];

  let firmadas = new Set<string>();
  if (rows.length > 0) {
    const { data: firmas } = await supabase
      .from('firmas')
      .select('referencia_id')
      .eq('contexto', 'entrega')
      .in('referencia_id', rows.map((r) => r.id));
    firmadas = new Set((firmas ?? []).map((f: any) => f.referencia_id));
  }

  const headers = [
    'Código',
    'Fecha y hora',
    'Socio (CUS)',
    'Socio (nombre)',
    'Lote',
    'Variedad',
    'Banco de semillas',
    '% THC',
    '% CBD',
    'Cantidad (g)',
    'Destino',
    'Responsable de la entrega',
    'Solicitud asociada',
    'Trasladado',
    'Firmado (recibo conforme)',
    'Observaciones',
  ];

  const lines = [headers.map(csvEscape).join(',')];

  for (const r of rows) {
    lines.push(
      [
        r.codigo,
        new Date(r.fecha_hora).toLocaleString('es-CL'),
        r.socio?.cus ?? '',
        r.socio?.nombre_completo ?? '',
        r.lote?.codigo ?? '',
        r.lote?.cultivo_genetica ?? '',
        r.lote?.banco_semillas ?? '',
        r.lote?.thc_pct ?? '',
        r.lote?.cbd_pct ?? '',
        r.cantidad_g,
        r.destino,
        r.responsable?.nombre_completo ?? '',
        r.solicitud?.n_control ?? '',
        r.trasladado ? 'Sí' : 'No',
        firmadas.has(r.id) ? 'Sí' : 'No',
        r.observaciones,
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  const csv = '\uFEFF' + lines.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="entregas.csv"',
    },
  });
}
