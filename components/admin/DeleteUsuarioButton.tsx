'use client';

import { useFormState } from 'react-dom';
import { eliminarUsuario, type EliminarUsuarioState } from '@/lib/actions/usuarios';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

const initialState: EliminarUsuarioState = {};

export default function DeleteUsuarioButton({ id, nombre }: { id: string; nombre: string }) {
  const [state, formAction] = useFormState(eliminarUsuario, initialState);

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <ConfirmSubmitButton
        confirmText={`¿Eliminar a "${nombre}"? Esta acción no se puede deshacer.`}
        className="text-xs text-red-600 hover:underline"
      >
        Eliminar
      </ConfirmSubmitButton>
      {state.error && (
        <p className="text-xs text-red-600 max-w-[220px] text-right">{state.error}</p>
      )}
    </form>
  );
}
