import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';
import PrintButton from '@/components/PrintButton';
import GanttLoteRow from '@/components/GanttLoteRow';

const PX_POR_DIA = 12;
const ANCHO_SEMANA = 7 * PX_POR_DIA;

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d;
}
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function inicioSemana(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // retrocede al lunes
  const r = new Date(d);
  r.setDate(d.getDate() + diff);
  return r;
}
function formatRangoSemana(start: Date, end: Date) {
  const mismoMes = start.getMonth() === end.getMonth();
  if (mismoMes) {
    return `${start.toLocaleDateString('es-CL', { day: 'numeric' })}–${end.toLocaleDateString('es-CL', { day: 'numeric' })}`;
  }
  return `${start.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}–${end.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`;
}

const ETAPA_COLOR: Record<string, string> = {
  Germinación: '#93c5a8',
  Vegetación: '#4d9b6a',
  Floración: '#1f4e2c',
  'Cosecha / secado': '#8a6d3b',
};

export default async function PlanificacionPage({ searchParams }: { searchParams: { activos?: string } }) {
  await requireStaff();
  const supabase = createClient();

  // Por defecto se muestra la línea de tiempo completa (incluye lotes cerrados),
  // para que quede el historial. "Ver solo activos" la acota si se prefiere.
  const soloActivos = searchParams?.activos === '1';
  const query = supabase
    .from('lotes')
    .select('id, codigo, fecha_inicio, cultivo_genetica, sem_germinacion, sem_vegetacion, sem_floracion, sem_cosecha, estado')
    .order('fecha_inicio', { ascending: true });
  if (soloActivos) query.not('estado', 'eq', 'cerrado');

  const { data: lotes, error } = await query;

  const filas = (lotes ?? []).map((l) => {
    const inicio = addDays(l.fecha_inicio, 0);
    const finGerminacion = addDays(l.fecha_inicio, (l.sem_germinacion ?? 0) * 7);
    const finVegetacion = addDays(toISO(finGerminacion), (l.sem_vegetacion ?? 0) * 7);
    const finFloracion = addDays(toISO(finVegetacion), (l.sem_floracion ?? 0) * 7);
    const finCosecha = addDays(toISO(finFloracion), (l.sem_cosecha ?? 0) * 7);
    return {
      lote: l,
      etapas: [
        { label: 'Germinación', inicio, fin: finGerminacion },
        { label: 'Vegetación', inicio: finGerminacion, fin: finVegetacion },
        { label: 'Floración', inicio: finVegetacion, fin: finFloracion },
        { label: 'Cosecha / secado', inicio: finFloracion, fin: finCosecha },
      ],
      inicioTotal: inicio,
      finTotal: finCosecha,
    };
  });

  let contenido;
  if (filas.length === 0) {
    contenido = (
      <div className="card p-8 text-center text-neutral-500 text-sm">
        No hay lotes {soloActivos ? 'activos ' : ''}para mostrar en la planificación.
      </div>
    );
  } else {
    const rawMin = filas.reduce((m, f) => (f.inicioTotal < m ? f.inicioTotal : m), filas[0].inicioTotal);
    const rawMax = filas.reduce((m, f) => (f.finTotal > m ? f.finTotal : m), filas[0].finTotal);

    const gridStart = inicioSemana(rawMin);
    const finSemanaMax = addDays(toISO(inicioSemana(rawMax)), 6);
    const gridEndExclusive = addDays(toISO(finSemanaMax), 1);
    const totalDaysGrid = Math.max(diffDays(gridStart, gridEndExclusive), 7);
    const totalWidth = totalDaysGrid * PX_POR_DIA;

    // Semanas del grid, con su rango de fechas.
    const semanas: { start: Date; end: Date }[] = [];
    let cursor = new Date(gridStart);
    while (cursor < gridEndExclusive) {
      const start = new Date(cursor);
      const end = addDays(toISO(start), 6);
      semanas.push({ start, end });
      cursor = addDays(toISO(start), 7);
    }

    // Agrupa las semanas por mes para la fila superior de la regla.
    const meses: { label: string; width: number }[] = [];
    for (const s of semanas) {
      const label = s.start.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
      const ultimo = meses[meses.length - 1];
      if (ultimo && ultimo.label === label) {
        ultimo.width += ANCHO_SEMANA;
      } else {
        meses.push({ label, width: ANCHO_SEMANA });
      }
    }

    // Plantas de todos los lotes mostrados, para desplegarlas al hacer clic.
    const loteIds = filas.map((f) => f.lote.id);
    const { data: todasPlantas } =
      loteIds.length > 0
        ? await supabase
            .from('plantas')
            .select('id, codigo, variedad, estado_sanitario, fecha_cosecha, lote_id')
            .in('lote_id', loteIds)
        : { data: [] as any[] };
    const plantasPorLote = new Map<string, any[]>();
    for (const p of todasPlantas ?? []) {
      if (!plantasPorLote.has(p.lote_id)) plantasPorLote.set(p.lote_id, []);
      plantasPorLote.get(p.lote_id)!.push(p);
    }

    contenido = (
      <div className="card p-5 overflow-x-auto print:overflow-visible">
        <div style={{ width: 160 + totalWidth + 80 }} className="print:w-max">
          {/* Fila de meses */}
          <div className="flex items-center">
            <div className="w-40 shrink-0" />
            <div className="flex border-b border-neutral-200" style={{ width: totalWidth }}>
              {meses.map((m, i) => (
                <div
                  key={i}
                  className="text-xs font-semibold text-brand text-center py-1 border-l border-neutral-200 capitalize truncate"
                  style={{ width: m.width }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            <div className="w-20 shrink-0" />
          </div>

          {/* Fila de semanas con su rango de fechas */}
          <div className="flex items-center mb-2">
            <div className="w-40 shrink-0" />
            <div className="flex border-b border-neutral-200" style={{ width: totalWidth }}>
              {semanas.map((s, i) => (
                <div
                  key={i}
                  className="text-[10px] text-neutral-400 text-center py-1 border-l border-neutral-100"
                  style={{ width: ANCHO_SEMANA }}
                >
                  {formatRangoSemana(s.start, s.end)}
                </div>
              ))}
            </div>
            <div className="w-20 shrink-0" />
          </div>

          {filas.map(({ lote, etapas }) => (
            <GanttLoteRow
              key={lote.id}
              loteId={lote.id}
              codigo={lote.codigo}
              cultivoGenetica={lote.cultivo_genetica}
              estado={lote.estado}
              totalWidth={totalWidth}
              plantas={plantasPorLote.get(lote.id) ?? []}
              etapas={etapas.map((e) => ({
                label: e.label,
                left: diffDays(gridStart, e.inicio) * PX_POR_DIA,
                width: Math.max(diffDays(e.inicio, e.fin) * PX_POR_DIA, 2),
                color: ETAPA_COLOR[e.label],
                tooltip: `${e.label}: ${toISO(e.inicio)} → ${toISO(e.fin)}`,
              }))}
            />
          ))}
        </div>

        <div className="flex gap-4 mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-500 print:hidden">
          {Object.entries(ETAPA_COLOR).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 print:hidden">
        <h1 className="text-xl font-bold text-brand">Planificación agrícola</h1>
        <div className="flex gap-2">
          <Link
            href={soloActivos ? '/agricola/planificacion' : '/agricola/planificacion?activos=1'}
            className="btn-secondary text-sm"
          >
            {soloActivos ? 'Ver línea de tiempo completa' : 'Ver solo lotes activos'}
          </Link>
          <PrintButton label="Imprimir / Guardar como PDF" />
        </div>
      </div>
      <p className="text-sm text-neutral-500 mb-6 print:hidden">
        Línea de tiempo completa con el historial de lotes (Manual 5.5 / 6.5). Haz clic en un lote para ver
        sus plantas. Para imprimir, usa orientación horizontal (apaisada) para que se vea completa.
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      {contenido}
    </div>
  );
}
