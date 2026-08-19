'use client';

import Link from 'next/link';
import { useState } from 'react';

interface EtapaBarra {
  label: string;
  left: number;
  width: number;
  color: string;
  tooltip: string;
}

interface PlantaResumen {
  id: string;
  codigo: string;
  variedad: string | null;
  estado_sanitario: string | null;
  fecha_cosecha: string | null;
}

export default function GanttLoteRow({
  loteId,
  codigo,
  cultivoGenetica,
  estado,
  etapas,
  totalWidth,
  plantas,
}: {
  loteId: string;
  codigo: string;
  cultivoGenetica: string | null;
  estado: string;
  etapas: EtapaBarra[];
  totalWidth: number;
  plantas: PlantaResumen[];
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="border-b border-neutral-100 last:border-b-0">
      <div className="flex items-center py-1.5">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="w-40 shrink-0 text-left text-sm pr-2"
        >
          <span className="font-semibold text-brand">
            {abierto ? '▾ ' : '▸ '}
            {codigo}
          </span>
          <br />
          <span className="text-xs text-neutral-400">{cultivoGenetica ?? '—'}</span>
        </button>
        <div className="relative h-6 bg-neutral-100 rounded shrink-0" style={{ width: totalWidth }}>
          {etapas.map((e) => (
            <div
              key={e.label}
              title={e.tooltip}
              className="absolute h-6 rounded first:rounded-l-md last:rounded-r-md"
              style={{ left: e.left, width: Math.max(e.width, 2), backgroundColor: e.color }}
            />
          ))}
        </div>
        <span className="w-20 shrink-0 text-right text-xs text-neutral-400 capitalize pl-2">{estado}</span>
      </div>

      {abierto && (
        <div className="ml-40 mb-3 mr-24 card overflow-x-auto">
          <table className="data-table w-full border-collapse text-sm">
            <thead>
              <tr>
                <th>Código</th>
                <th>Variedad</th>
                <th>Estado sanitario</th>
                <th>Cosecha estimada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plantas.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-neutral-500 py-4">
                    Este lote todavía no tiene plantas registradas.
                  </td>
                </tr>
              )}
              {plantas.map((p) => (
                <tr key={p.id}>
                  <td>{p.codigo}</td>
                  <td>{p.variedad ?? '—'}</td>
                  <td>{p.estado_sanitario ?? '—'}</td>
                  <td>{p.fecha_cosecha ?? '—'}</td>
                  <td>
                    <Link href={`/agricola/plantas/${p.id}`} className="text-brand underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2">
            <Link href={`/agricola/lotes/${loteId}`} className="text-xs text-brand underline">
              Ver ficha completa del lote →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
