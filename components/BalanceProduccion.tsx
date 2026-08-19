'use client';

import { useState } from 'react';

interface LoteContribucion {
  id: string;
  codigo: string;
  variedad: string | null;
  produccionG: number;
}

interface ProyeccionMes {
  mes: string;
  label: string;
  produccionG: number;
  lotes: LoteContribucion[];
}

export default function BalanceProduccion({
  demandaMensualG,
  sociosConsiderados,
  sociosActivosTotal,
  stockDisponibleG,
  produccionProyectadaTotalG,
  mesesCobertura,
  proyeccionPorMes,
}: {
  demandaMensualG: number;
  sociosConsiderados: number;
  sociosActivosTotal: number;
  stockDisponibleG: number;
  produccionProyectadaTotalG: number;
  mesesCobertura: number | null;
  proyeccionPorMes: ProyeccionMes[];
}) {
  const [abierto, setAbierto] = useState<string | null>(null);

  const maxValor = Math.max(demandaMensualG, ...proyeccionPorMes.map((m) => m.produccionG), 1);
  const coberturaBaja = mesesCobertura !== null && mesesCobertura < 1;

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-brand mb-1">Balance: necesidad de socios vs. producción</h2>
      <p className="text-xs text-neutral-500 mb-4">
        Se alimenta solo de datos ya cargados: el tope mensual de la ficha de cada socio activo, y la
        producción esperada de los lotes que van andando (según su planilla de plantas). Haz clic en un mes
        para ver qué lotes aportan.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="rounded-md border border-neutral-200 p-4">
          <p className="text-2xl font-bold text-brand">{demandaMensualG.toLocaleString('es-CL')} g</p>
          <p className="text-xs text-neutral-500 mt-1">
            Necesidad mensual ({sociosConsiderados} de {sociosActivosTotal} socios con tope definido)
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 p-4">
          <p className="text-2xl font-bold text-brand">{stockDisponibleG.toLocaleString('es-CL')} g</p>
          <p className="text-xs text-neutral-500 mt-1">Stock disponible ahora</p>
        </div>
        <div className="rounded-md border border-neutral-200 p-4">
          <p className="text-2xl font-bold text-brand">{produccionProyectadaTotalG.toLocaleString('es-CL')} g</p>
          <p className="text-xs text-neutral-500 mt-1">Producción proyectada (lotes en curso)</p>
        </div>
        <div className={`rounded-md border p-4 ${coberturaBaja ? 'border-red-300 bg-red-50' : 'border-brand bg-brand-pale'}`}>
          <p className={`text-2xl font-bold ${coberturaBaja ? 'text-red-600' : 'text-brand'}`}>
            {mesesCobertura !== null ? `${mesesCobertura} meses` : '—'}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Cobertura estimada (stock + proyección ÷ necesidad mensual)</p>
        </div>
      </div>

      {proyeccionPorMes.length === 0 ? (
        <p className="text-sm text-neutral-400">No hay lotes en curso con producción proyectada todavía.</p>
      ) : (
        <div className="space-y-3">
          {proyeccionPorMes.map((m) => {
            const pct = Math.max((m.produccionG / maxValor) * 100, 2);
            const pctDemanda = demandaMensualG > 0 ? Math.min((demandaMensualG / maxValor) * 100, 100) : null;
            const cubreDemanda = demandaMensualG > 0 && m.produccionG >= demandaMensualG;
            const abiertoAqui = abierto === m.mes;
            return (
              <div key={m.mes}>
                <button type="button" onClick={() => setAbierto(abiertoAqui ? null : m.mes)} className="w-full text-left">
                  <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                    <span className="capitalize">
                      {abiertoAqui ? '▾ ' : '▸ '}
                      {m.label}
                    </span>
                    <span>{m.produccionG.toLocaleString('es-CL')} g</span>
                  </div>
                  <div className="relative h-4 bg-neutral-100 rounded">
                    <div
                      className={`h-4 rounded ${cubreDemanda ? 'bg-brand' : 'bg-amber-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                    {pctDemanda !== null && (
                      <div
                        className="absolute top-0 h-4 border-l-2 border-red-500"
                        style={{ left: `${pctDemanda}%` }}
                        title={`Necesidad mensual: ${demandaMensualG.toLocaleString('es-CL')} g`}
                      />
                    )}
                  </div>
                </button>
                {abiertoAqui && (
                  <div className="ml-4 mt-2 mb-1 border-l-2 border-neutral-100 pl-4 space-y-1">
                    {m.lotes.map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-xs text-neutral-500">
                        <span>
                          {l.codigo}
                          {l.variedad ? ` — ${l.variedad}` : ''}
                        </span>
                        <span>{l.produccionG.toLocaleString('es-CL')} g</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {demandaMensualG > 0 && (
            <p className="text-[11px] text-neutral-400 pt-1">La línea roja marca la necesidad mensual de los socios.</p>
          )}
        </div>
      )}
    </div>
  );
}
