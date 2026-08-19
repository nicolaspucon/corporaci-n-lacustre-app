import type { EntityDef } from '@/lib/entities';
import { createRegistro } from '@/lib/actions/registros';

interface RelationOption {
  id: string;
  label: string;
}

export default function EntityForm({
  entity,
  loteOptions,
  plantaOptions,
  error,
}: {
  entity: EntityDef;
  loteOptions?: RelationOption[];
  plantaOptions?: RelationOption[];
  error?: string;
}) {
  const tieneFaseFinal = entity.fields.some((f) => f.faseFinal);

  return (
    <form action={createRegistro} className="card p-6 space-y-4 max-w-2xl">
      <input type="hidden" name="__slug" value={entity.slug} />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}

      {tieneFaseFinal && (
        <p className="text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
          Los datos que recién se sabrán al terminar el proceso (como fecha de término o peso final) se
          completan después, desde la ficha de este registro.
        </p>
      )}

      {entity.fields
        .filter((field) => !field.faseFinal)
        .map((field) => (
        <div key={field.key}>
          <label className="label" htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
          </label>

          {field.type === 'textarea' && (
            <textarea className="input" id={field.key} name={field.key} rows={3} required={field.required} />
          )}

          {field.type === 'select' && (
            <select className="input" id={field.key} name={field.key} required={field.required}>
              <option value="">— Selecciona —</option>
              {field.options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          )}

          {field.type === 'lote' && (
            <select className="input" id={field.key} name={field.key} required={field.required}>
              <option value="">— Selecciona un lote —</option>
              {loteOptions?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}

          {field.type === 'planta' && (
            <select className="input" id={field.key} name={field.key} required={field.required}>
              <option value="">— Selecciona una planta —</option>
              {plantaOptions?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}

          {field.type === 'boolean' && (
            <input className="h-4 w-4" id={field.key} name={field.key} type="checkbox" />
          )}

          {field.type === 'photo' && (
            <>
              <input
                className="input"
                id={field.key}
                name={field.key}
                type="file"
                accept="image/*"
                capture="environment"
                required={field.required}
              />
              <p className="text-xs text-neutral-400 mt-1">
                En el celular esto abre la cámara para tomar la foto en el momento.
              </p>
            </>
          )}

          {['text', 'number', 'date', 'time', 'datetime-local'].includes(field.type) && (
            <input
              className="input"
              id={field.key}
              name={field.key}
              type={field.type}
              step={field.type === 'number' ? 'any' : undefined}
              required={field.required}
            />
          )}
        </div>
      ))}

      <div className="pt-2 flex gap-3">
        <button className="btn-primary" type="submit">
          Guardar registro
        </button>
      </div>
    </form>
  );
}
