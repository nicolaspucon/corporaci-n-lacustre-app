export default function AnuladoBanner({
  fecha,
  anuladoPor,
  motivo,
}: {
  fecha: string;
  anuladoPor?: string | null;
  motivo?: string | null;
}) {
  return (
    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
      Anulado el {new Date(fecha).toLocaleString('es-CL')} por {anuladoPor ?? '—'}. Motivo: {motivo ?? '—'}
    </p>
  );
}
