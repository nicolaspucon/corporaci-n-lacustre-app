// Cálculo automático de "plantas activas", a partir de datos que ya existen
// en la app (lotes, plantas madre y esquejes) — sin necesidad de contar a mano.
//
// Etapas:
//  - Enraizado: esquejes todavía en enraizamiento + lotes que recién están en
//    germinación (semilla). Ambos son la fase inicial de establecimiento.
//  - Crecimiento: plantas madre activas (se mantienen siempre en vegetativo) +
//    lotes actualmente en etapa de vegetación.
//  - Floración: lotes actualmente en etapa de floración.
//  - Procesado: lotes que ya pasaron floración (entraron a cosecha/secado) o
//    cuyo estado se marcó manualmente como "cosechado"/"cerrado". Estas plantas
//    dejan de estar activas en campo y siguen su trazabilidad en Secado/Curado.
//
// La etapa de cada lote se calcula con la misma lógica de fechas que usa la
// Carta Gantt (fecha_inicio + semanas por etapa), así que se alimenta sola a
// medida que pasan los días, sin que nadie tenga que actualizar un estado a mano.

export type EtapaLote = 'planificado' | 'germinacion' | 'vegetacion' | 'floracion' | 'procesado';

interface LoteBase {
  id: string;
  codigo: string;
  fecha_inicio: string;
  sem_germinacion: number | null;
  sem_vegetacion: number | null;
  sem_floracion: number | null;
  sem_cosecha: number | null;
  estado: string;
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d;
}
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function etapaLotePorFecha(lote: LoteBase, hoy: Date = new Date()): EtapaLote {
  // Un estado terminal marcado a mano siempre manda, aunque las fechas digan otra cosa
  // (por ejemplo, una cosecha anticipada).
  if (lote.estado === 'cosechado' || lote.estado === 'cerrado') return 'procesado';

  const inicio = addDays(lote.fecha_inicio, 0);
  if (hoy < inicio) return 'planificado';

  const finGerminacion = addDays(lote.fecha_inicio, (lote.sem_germinacion ?? 0) * 7);
  if (hoy < finGerminacion) return 'germinacion';

  const finVegetacion = addDays(toISO(finGerminacion), (lote.sem_vegetacion ?? 0) * 7);
  if (hoy < finVegetacion) return 'vegetacion';

  const finFloracion = addDays(toISO(finVegetacion), (lote.sem_floracion ?? 0) * 7);
  if (hoy < finFloracion) return 'floracion';

  // Pasado el fin de floración entra a cosecha/secado: ya no es una planta activa en campo.
  return 'procesado';
}

export interface ResumenPlantasActivas {
  enraizado: { esquejes: number; germinacionLotes: number; total: number };
  crecimiento: { madres: number; lotes: number; total: number };
  floracion: { total: number };
  totalActivas: number;
  procesadoAcumulado: number;
  mermasAcumuladas: number;
  detalleLotes: { id: string; codigo: string; etapa: EtapaLote; plantas: number }[];
}

export async function calcularPlantasActivas(supabase: any): Promise<ResumenPlantasActivas> {
  const hoy = new Date();

  const [{ data: lotes }, { count: madresActivasCount }, { data: esquejesEnraizando }, { data: esquejesTodos }] =
    await Promise.all([
      supabase
        .from('lotes')
        .select('id, codigo, fecha_inicio, sem_germinacion, sem_vegetacion, sem_floracion, sem_cosecha, estado, n_plantas'),
      supabase.from('plantas_madre').select('id', { count: 'exact', head: true }).eq('estado', 'activa'),
      supabase.from('esquejes').select('id, cantidad_realizados').eq('estado', 'enraizamiento'),
      supabase.from('esquejes').select('cantidad_perdidas'),
    ]);

  const loteIds = (lotes ?? []).map((l: any) => l.id);
  const { data: todasPlantas } =
    loteIds.length > 0
      ? await supabase.from('plantas').select('id, lote_id').in('lote_id', loteIds)
      : { data: [] as any[] };

  const plantasPorLote = new Map<string, number>();
  for (const p of todasPlantas ?? []) {
    plantasPorLote.set(p.lote_id, (plantasPorLote.get(p.lote_id) ?? 0) + 1);
  }

  let enraizadoLotes = 0;
  let crecimientoLotes = 0;
  let floracionTotal = 0;
  let procesadoAcumulado = 0;
  const detalleLotes: ResumenPlantasActivas['detalleLotes'] = [];

  for (const l of lotes ?? []) {
    const etapa = etapaLotePorFecha(l as LoteBase, hoy);
    const plantas = plantasPorLote.get(l.id) ?? l.n_plantas ?? 0;
    detalleLotes.push({ id: l.id, codigo: l.codigo, etapa, plantas });

    if (etapa === 'germinacion') enraizadoLotes += plantas;
    else if (etapa === 'vegetacion') crecimientoLotes += plantas;
    else if (etapa === 'floracion') floracionTotal += plantas;
    else if (etapa === 'procesado') procesadoAcumulado += plantas;
  }

  const enraizadoEsquejes = (esquejesEnraizando ?? []).reduce(
    (sum: number, e: any) => sum + (e.cantidad_realizados ?? 0),
    0
  );
  const madres = madresActivasCount ?? 0;
  const mermasAcumuladas = (esquejesTodos ?? []).reduce(
    (sum: number, e: any) => sum + (e.cantidad_perdidas ?? 0),
    0
  );

  const enraizado = {
    esquejes: enraizadoEsquejes,
    germinacionLotes: enraizadoLotes,
    total: enraizadoEsquejes + enraizadoLotes,
  };
  const crecimiento = { madres, lotes: crecimientoLotes, total: madres + crecimientoLotes };
  const floracion = { total: floracionTotal };
  const totalActivas = enraizado.total + crecimiento.total + floracion.total;

  return {
    enraizado,
    crecimiento,
    floracion,
    totalActivas,
    procesadoAcumulado,
    mermasAcumuladas,
    detalleLotes,
  };
}
