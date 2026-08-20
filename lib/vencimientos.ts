// Alerta agregada de vencimientos: recetas médicas (fichas_perfil.vigencia_receta)
// y documentos del expediente (socio_documentos.vigencia_hasta) de socios
// activos, que ya vencieron o vencen dentro de los próximos 30 días. Pensado
// para mostrarse en el panel general del equipo técnico, alimentado
// automáticamente de los datos que ya existen en la app.

export interface VencimientoItem {
  socioId: string;
  socioCus: string;
  socioNombre: string;
  tipo: 'receta' | 'documento';
  detalle: string;
  fechaVencimiento: string;
  diasRestantes: number;
  vencido: boolean;
}

const DIAS_ALERTA = 30;

export async function calcularVencimientos(supabase: any): Promise<VencimientoItem[]> {
  const hoy = new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + DIAS_ALERTA);
  const limiteStr = limite.toISOString().slice(0, 10);

  const { data: socios } = await supabase
    .from('socios')
    .select('id, cus, nombre_completo')
    .eq('estado', 'activo')
    .is('anulado_en', null);

  const socioIds = (socios ?? []).map((s: any) => s.id);
  if (socioIds.length === 0) return [];

  const socioPorId = new Map((socios ?? []).map((s: any) => [s.id, s]));

  const [{ data: fichas }, { data: documentos }] = await Promise.all([
    supabase
      .from('fichas_perfil')
      .select('socio_id, vigencia_receta, numero_receta')
      .in('socio_id', socioIds)
      .not('vigencia_receta', 'is', null)
      .lte('vigencia_receta', limiteStr),
    supabase
      .from('socio_documentos')
      .select('socio_id, tipo, vigencia_hasta')
      .in('socio_id', socioIds)
      .not('vigencia_hasta', 'is', null)
      .lte('vigencia_hasta', limiteStr),
  ]);

  const items: VencimientoItem[] = [];

  for (const f of fichas ?? []) {
    const socio = socioPorId.get(f.socio_id);
    if (!socio) continue;
    const dias = diasEntre(hoyStr, f.vigencia_receta);
    items.push({
      socioId: socio.id,
      socioCus: socio.cus,
      socioNombre: socio.nombre_completo,
      tipo: 'receta',
      detalle: f.numero_receta ? `Receta médica N.º ${f.numero_receta}` : 'Receta médica',
      fechaVencimiento: f.vigencia_receta,
      diasRestantes: dias,
      vencido: dias < 0,
    });
  }

  for (const d of documentos ?? []) {
    const socio = socioPorId.get(d.socio_id);
    if (!socio) continue;
    const dias = diasEntre(hoyStr, d.vigencia_hasta);
    items.push({
      socioId: socio.id,
      socioCus: socio.cus,
      socioNombre: socio.nombre_completo,
      tipo: 'documento',
      detalle: `Documento (${d.tipo})`,
      fechaVencimiento: d.vigencia_hasta,
      diasRestantes: dias,
      vencido: dias < 0,
    });
  }

  return items.sort((a, b) => a.diasRestantes - b.diasRestantes);
}

function diasEntre(desdeStr: string, hastaStr: string) {
  const desde = new Date(desdeStr + 'T00:00:00');
  const hasta = new Date(hastaStr + 'T00:00:00');
  return Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24));
}
