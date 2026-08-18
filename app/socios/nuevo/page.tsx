import { requireStaff } from '@/lib/auth';
import { createSocio } from '@/lib/actions/socios';

const CATEGORIAS = ['activo', 'usuario_medicinal', 'honorario'];

export default async function NuevoSocioPage({ searchParams }: { searchParams: { error?: string } }) {
  await requireStaff();

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Nuevo socio</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Al guardar se genera automáticamente el CUS y el checklist del Expediente de Incorporación
        (Manual 4.16 / IDX-001).
      </p>

      <form action={createSocio} className="card p-6 space-y-4 max-w-2xl">
        {searchParams?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {searchParams.error}
          </p>
        )}

        <div>
          <label className="label" htmlFor="nombre_completo">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input className="input" id="nombre_completo" name="nombre_completo" required />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="rut">RUT</label>
            <input className="input" id="rut" name="rut" placeholder="12.345.678-9" />
          </div>
          <div>
            <label className="label" htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
            <input className="input" id="fecha_nacimiento" name="fecha_nacimiento" type="date" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="direccion">Dirección</label>
          <input className="input" id="direccion" name="direccion" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="telefono">Teléfono</label>
            <input className="input" id="telefono" name="telefono" />
          </div>
          <div>
            <label className="label" htmlFor="email">Correo electrónico</label>
            <input className="input" id="email" name="email" type="email" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="categoria">Categoría de socio</label>
          <select className="input" id="categoria" name="categoria" defaultValue="activo">
            {CATEGORIAS.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary">
          Guardar y crear expediente
        </button>
      </form>
    </div>
  );
}
