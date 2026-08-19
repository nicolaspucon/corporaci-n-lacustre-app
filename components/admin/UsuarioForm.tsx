'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { crearUsuario, type CrearUsuarioState } from '@/lib/actions/usuarios';
import { ROL_LABELS } from '@/lib/roles';

const initialState: CrearUsuarioState = {};

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Creando...' : 'Crear usuario'}
    </button>
  );
}

export default function UsuarioForm({
  socios,
}: {
  socios: { id: string; nombre_completo: string; cus: string }[];
}) {
  const [state, formAction] = useFormState(crearUsuario, initialState);

  return (
    <form action={formAction} className="card p-6 space-y-4 max-w-2xl">
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-brand bg-brand-pale border border-brand/20 rounded px-3 py-2">
          {state.success}
        </p>
      )}

      <div>
        <label className="label" htmlFor="nombre_completo">
          Nombre completo <span className="text-red-500">*</span>
        </label>
        <input className="input" id="nombre_completo" name="nombre_completo" required />
      </div>

      <div>
        <label className="label" htmlFor="email">
          Correo electrónico <span className="text-red-500">*</span>
        </label>
        <input className="input" id="email" name="email" type="email" required />
      </div>

      <div>
        <label className="label" htmlFor="rol">
          Rol <span className="text-red-500">*</span>
        </label>
        <select className="input" id="rol" name="rol" defaultValue="socio">
          {Object.entries(ROL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="socio_id">
          Vincular a ficha de socio (solo si el rol es "Socio")
        </label>
        <select className="input" id="socio_id" name="socio_id" defaultValue="">
          <option value="">— Selecciona un socio —</option>
          {socios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.cus} — {s.nombre_completo}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-neutral-500">
        Se generará una contraseña temporal automáticamente, que se mostrará aquí una sola vez
        después de crear el usuario. Cópiala y entrégasela de forma segura a la persona.
      </p>

      <BotonGuardar />
    </form>
  );
}
