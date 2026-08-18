import { requireStaff } from '@/lib/auth';
import { crearLote } from '@/lib/actions/agricola';

export default async function NuevoLotePage({ searchParams }: { searchParams: { error?: string } }) {
  await requireStaff();

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Nuevo lote</h1>
      <p className="text-sm text-neutral-500 mb-6">
        El código LT- se genera automáticamente. Las fechas de germinación, vegetación, floración y cosecha
        se calculan solas en Planificación a partir de la fecha de inicio y las semanas por etapa.
      </p>

      <form action={crearLote} className="card p-6 space-y-4 max-w-2xl">
        {searchParams?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {searchParams.error}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="fecha_inicio">
              Fecha de inicio <span className="text-red-500">*</span>
            </label>
            <input className="input" id="fecha_inicio" name="fecha_inicio" type="date" required />
          </div>
          <div>
            <label className="label" htmlFor="cultivo_genetica">Genética / cultivo</label>
            <input className="input" id="cultivo_genetica" name="cultivo_genetica" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="area_m2">Área (m²)</label>
            <input className="input" id="area_m2" name="area_m2" type="number" step="0.01" />
          </div>
          <div>
            <label className="label" htmlFor="n_plantas">N° de plantas planificadas</label>
            <input className="input" id="n_plantas" name="n_plantas" type="number" />
          </div>
        </div>

        <p className="label !mb-0 pt-2">Duración por etapa (semanas)</p>
        <div className="grid sm:grid-cols-4 gap-4">
          <div>
            <label className="label" htmlFor="sem_germinacion">Germinación</label>
            <input className="input" id="sem_germinacion" name="sem_germinacion" type="number" defaultValue={2} />
          </div>
          <div>
            <label className="label" htmlFor="sem_vegetacion">Vegetación</label>
            <input className="input" id="sem_vegetacion" name="sem_vegetacion" type="number" defaultValue={5} />
          </div>
          <div>
            <label className="label" htmlFor="sem_floracion">Floración</label>
            <input className="input" id="sem_floracion" name="sem_floracion" type="number" defaultValue={11} />
          </div>
          <div>
            <label className="label" htmlFor="sem_cosecha">Cosecha/secado</label>
            <input className="input" id="sem_cosecha" name="sem_cosecha" type="number" defaultValue={1} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="rendimiento_esperado_m2">Rendimiento esperado (g/m²)</label>
            <input className="input" id="rendimiento_esperado_m2" name="rendimiento_esperado_m2" type="number" step="0.01" />
          </div>
          <div>
            <label className="label" htmlFor="rendimiento_esperado_planta">Rendimiento esperado (g/planta)</label>
            <input className="input" id="rendimiento_esperado_planta" name="rendimiento_esperado_planta" type="number" step="0.01" />
          </div>
        </div>

        <button type="submit" className="btn-primary">
          Guardar lote
        </button>
      </form>
    </div>
  );
}
