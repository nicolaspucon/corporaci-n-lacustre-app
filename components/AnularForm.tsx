import ConfirmSubmitButton from './ConfirmSubmitButton';

export default function AnularForm({
  action,
  idField,
  idValue,
  label = 'registro',
}: {
  action: (formData: FormData) => void | Promise<void>;
  idField: string;
  idValue: string;
  label?: string;
}) {
  return (
    <div className="pt-2">
      <h2 className="font-semibold text-red-700 mb-2 text-sm">Anular {label}</h2>
      <p className="text-xs text-neutral-500 mb-2">
        No se elimina de la base de datos: queda oculto de la lista normal, pero se conserva con fecha,
        usuario y motivo para poder demostrarlo ante una fiscalización.
      </p>
      <form action={action} className="flex items-start gap-3">
        <input type="hidden" name={idField} value={idValue} />
        <textarea
          className="input flex-1"
          name="motivo"
          rows={2}
          required
          placeholder="Motivo de la anulación (obligatorio)"
        />
        <ConfirmSubmitButton
          confirmText={`¿Anular este ${label}? Quedará marcado como anulado y fuera de los cálculos, pero no se borra.`}
          className="text-sm text-red-600 hover:underline whitespace-nowrap pt-2"
        >
          Anular {label}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
