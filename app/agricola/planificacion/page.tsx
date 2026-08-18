import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import Link from 'next/link';

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

const ETAPA_COLOR: Record<string, string> = {
  Germinación: '#93c5a8',
  Vegetación: '#4d9b6a',
  Floración: '#1f4e2c',
  'Cosecha / secado': '#8a6d3b',
};

export default async function PlanificacionPage({ searchParams }: { searchParams: { todos?: string } }) {
  await requireStaff();
  const supabase = createClient();

  const mostrarTodos = searchParams?.todos === '1';
  const query = supabase
    .from('lotes')
    .select('id, codigo, fecha_inicio, cultivo_genetica, sem_germinacion, sem_vegetacion, sem_floracion, sem_cosecha, estado')
    .order('fecha_inicio', { ascending: true });
  if (!mostrarTodos) query.not('estado', 'eq', 'cerrado');

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
        No hay lotes {mostrarTodos ? '' : 'activos '}para mostrar en la planificación.
      </div>
    );
  } else {
    const minDate = filas.reduce((m, f) => (f.inicioTotal < m ? f.inicioTotal : m), filas[0].inicioTotal);
    const maxDate = filas.reduce((m, f) => (f.finTotal > m ? f.finTotal : m), filas[0].finTotal);
    const totalDays = Math.max(diffDays(minDate, maxDate), 1);

    // Marcas mensuales para la regla superior
    const marcas: { label: string; pct: number }[] = [];
    const cursor = new Date(minDate);
    cursor.setDate(1);
    while (cursor <= maxDate) {
      const pct = (diffDays(minDate, cursor) / totalDays) * 100;
      if (pct >= 0) {
        marcas.push({
          label: cursor.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }),
          pct,
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    contenido = (
      <div className="card p-5 overflow-x-auto">
        <div style={{ minWidth: 800 }}>
          {/* Regla de meses */}
          <div className="relative h-6 border-b border-neutral-200 mb-2 ml-40">
            {marcas.map((m, i) => (
              <span
                key={i}
                className="absolute text-xs text-neutral-400"
                style={{ left: `${m.pct}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {filas.map(({ lote, etapas }) => (
            <div key={lote.id} className="flex items-center mb-3">
              <Link href={`/agricola/lotes/${lote.id}`} className="w-40 shrink-0 text-sm hover:underline">
                <span className="font-semibold text-brand">{lote.codigo}</span>
                <br />
                <span className="text-xs text-neutral-400">{lote.cultivo_genetica ?? '—'}</span>
              </Link>
              <div className="relative flex-1 h-6 bg-neutral-100 rounded">
                {etapas.map((e) => {
                  const left = (diffDays(minDate, e.inicio) / totalDays) * 100;
                  const width = Math.max((diffDays(e.inicio, e.fin) / totalDays) * 100, 0.5);
                  return (
                    <div
                      key={e.label}
                      title={`${e.label}: ${toISO(e.inicio)} → ${toISO(e.fin)}`}
                      className="absolute h-6 rounded first:rounded-l-md last:rounded-r-md"
                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: ETAPA_COLOR[e.label] }}
                    />
                  );
                })}
              </div>
              <span className="w-20 shrink-0 text-right text-xs text-neutral-400 capitalize">{lote.estado}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
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
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-brand">Planificación agrícola</h1>
        <Link
          href={mostrarTodos ? '/agricola/planificacion' : '/agricola/planificacion?todos=1'}
          className="btn-secondary text-sm"
        >
          {mostrarTodos ? 'Ver solo lotes activos' : 'Ver también lotes cerrados'}
        </Link>
      </div>
      <p className="text-sm text-neutral-500 mb-6">
        Fechas de germinación, vegetación, floración y cosecha calculadas automáticamente a partir de la
        fecha de inicio de cada lote (Manual 5.5 / 6.5).
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
