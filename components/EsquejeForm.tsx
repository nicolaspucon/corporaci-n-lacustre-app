'use client';

import { useState } from 'react';
import { crearEsqueje } from '@/lib/actions/agricola';

interface MadreOption {
  id: string;
  codigo: string;
  variedad: string;
  banco_semillas: string | null;
  thc_pct: number | null;
  cbd_pct: number | null;
}

export default function EsquejeForm({
  madres,
  defaultMadreId,
  error,
}: {
  madres: MadreOption[];
  defaultMadreId?: string;
  error?: string;
}) {
  const [madreId, setMadreId] = useState(defaultMadreId ?? '');
  const [variedadManual, setVariedadManual] = useState('');
  const [bancoManual, setBancoManual] = useState('');
  const [thcManual, setThcManual] = useState('');
  const [cbdManual, setCbdManual] = useState('');

  const madre = madres.find((m) => m.id === madreId) ?? null;

  return (
    <form action={crearEsqueje} className="card p-6 space-y-4 max-w-2xl">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}

      <div>
        <label className="label" htmlFor="madre_id">Planta madre de origen (opcional)</label>
        <select
          className="input"
          id="madre_id"
          name="madre_id"
          value={madreId}
          onChange={(e) => setMadreId(e.target.value)}
        >
          <option value="">— Sin madre específica —</option>
          {madres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.codigo} — {m.variedad}
            </option>
          ))}
        </select>
        {madre && (
          <p className="text-xs text-brand mt-1">
            Variedad, banco de semillas y % THC/CBD se copiaron solos desde esta madre (el esqueje es
            genéticamente idéntico a ella).
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="variedad">
            Variedad {!madre && <span className="text-red-500">*</span>}
          </label>
          <input
            className="input disabled:bg-neutral-100 disabled:text-neutral-500"
            id="variedad"
            name="variedad"
            required={!madre}
            disabled={!!madre}
            value={madre ? madre.variedad : variedadManual}
            onChange={(e) => setVariedadManual(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="fecha">Fecha</label>
          <input
            className="input"
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="banco_semillas">Banco de semillas (marca)</label>
        <input
          className="input disabled:bg-neutral-100 disabled:text-neutral-500"
          id="banco_semillas"
          name="banco_semillas"
          disabled={!!madre}
          value={madre ? madre.banco_semillas ?? '' : bancoManual}
          onChange={(e) => setBancoManual(e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="thc_pct">% THC</label>
          <input
            className="input disabled:bg-neutral-100 disabled:text-neutral-500"
            id="thc_pct"
            name="thc_pct"
            type="number"
            step="0.01"
            disabled={!!madre}
            value={madre ? madre.thc_pct ?? '' : thcManual}
            onChange={(e) => setThcManual(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="cbd_pct">% CBD</label>
          <input
            className="input disabled:bg-neutral-100 disabled:text-neutral-500"
            id="cbd_pct"
            name="cbd_pct"
            type="number"
            step="0.01"
            disabled={!!madre}
            value={madre ? madre.cbd_pct ?? '' : cbdManual}
            onChange={(e) => setCbdManual(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="cantidad_realizados">
          Cantidad de esquejes realizados <span className="text-red-500">*</span>
        </label>
        <input className="input" id="cantidad_realizados" name="cantidad_realizados" type="number" required />
      </div>

      <div>
        <label className="label" htmlFor="observaciones">Observaciones</label>
        <textarea className="input" id="observaciones" name="observaciones" rows={3} />
      </div>

      <button type="submit" className="btn-primary">
        Guardar esquejado
      </button>
    </form>
  );
}
