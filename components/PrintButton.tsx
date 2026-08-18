'use client';

export default function PrintButton({ label = 'Imprimir / guardar como PDF' }: { label?: string }) {
  return (
    <button type="button" className="btn-secondary print:hidden" onClick={() => window.print()}>
      {label}
    </button>
  );
}
