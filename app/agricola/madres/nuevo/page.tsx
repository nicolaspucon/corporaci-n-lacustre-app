import { requireStaff } from '@/lib/auth';
import { crearMadre } from '@/lib/actions/agricola';

export default async function NuevaMadrePage({ searchParams }: { searchParams: { error?: string } }) {
  await requireStaff();

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Nueva planta madre</h1>
      <p className="text-sm text-neutral-500 mb-6">El código MD- se genera automáticamente.</p>

      <form action={crearMadre} className="card p-6 space-y-4 max-w-2xl">
        {searchParams?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {searchParams.error}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="variedad">
              Variedad <span className="text-red-500">*</span>
            </label>
            <input className="input" id="variedad" name="variedad" required />
          </div>
          <div>
            <label className="label" htmlFor="fecha_inicio">Fecha de inicio</label>
            <input
              className="input"
              id="fecha_inicio"
              name="fecha_inicio"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ubicacion">Ubicación</label>
          <input className="input" id="ubicacion" name="ubicacion" />
        </div>

        <div>
          <label className="label" htmlFor="observaciones">Observaciones</label>
          <textarea className="input" id="observaciones" name="observaciones" rows={3} />
        </div>

        <button type="submit" className="btn-primary">
          Guardar madre
        </button>
      </form>
    </div>
  );
}
