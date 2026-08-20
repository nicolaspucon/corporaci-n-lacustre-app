import Link from 'next/link';

interface Column {
  key: string;
  label: string;
}

export default function DataTable({
  columns,
  rows,
  emptyLabel = 'Sin registros todavía.',
  linkTo,
}: {
  columns: Column[];
  rows: Record<string, any>[];
  emptyLabel?: string;
  linkTo?: (row: Record<string, any>) => string;
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card p-8 text-center text-neutral-500 text-sm">{emptyLabel}</div>
    );
  }

  const [primeraColumna, ...columnasResto] = columns;

  return (
    <>
      {/* Móvil: tarjetas apiladas en vez de tabla (más fácil de leer/usar con el dedo). */}
      <div className="md:hidden space-y-3">
        {rows.map((row, i) => {
          const contenido = (
            <>
              <p className="font-semibold text-brand mb-1">{formatCell(row[primeraColumna.key])}</p>
              <dl className="space-y-0.5">
                {columnasResto.map((c) => (
                  <div key={c.key} className="flex items-baseline justify-between gap-3 text-sm">
                    <dt className="text-neutral-500 shrink-0">{c.label}</dt>
                    <dd className="text-right text-neutral-800">{formatCell(row[c.key])}</dd>
                  </div>
                ))}
              </dl>
              {linkTo && <p className="text-brand text-sm mt-2 font-medium">Ver →</p>}
            </>
          );
          return linkTo ? (
            <Link key={row.id ?? i} href={linkTo(row)} className="mobile-list-card">
              {contenido}
            </Link>
          ) : (
            <div key={row.id ?? i} className="card p-4">
              {contenido}
            </div>
          );
        })}
      </div>

      {/* Desktop: tabla normal. */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="data-table w-full border-collapse">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              {linkTo && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? i}>
                {columns.map((c) => (
                  <td key={c.key}>{formatCell(row[c.key])}</td>
                ))}
                {linkTo && (
                  <td>
                    <Link href={linkTo(row)} className="text-brand underline text-sm">
                      Ver
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function formatCell(value: any) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object' && value?.codigo) return value.codigo;
  if (typeof value === 'object' && value?.nombre_completo) return value.nombre_completo;
  return String(value);
}
