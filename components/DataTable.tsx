import Link from 'next/link';

interface Column {
  key: string;
  label: string;
}

export default function DataTable({
  columns,
  rows,
  emptyLabel = 'Sin registros todavía.',
}: {
  columns: Column[];
  rows: Record<string, any>[];
  emptyLabel?: string;
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card p-8 text-center text-neutral-500 text-sm">{emptyLabel}</div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="data-table w-full border-collapse">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map((c) => (
                <td key={c.key}>{formatCell(row[c.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: any) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object' && value?.codigo) return value.codigo;
  if (typeof value === 'object' && value?.nombre_completo) return value.nombre_completo;
  return String(value);
}
