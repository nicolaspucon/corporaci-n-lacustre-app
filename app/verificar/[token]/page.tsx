import { createClient } from '@/lib/supabase/server';

export default async function VerificarEntregaPage({ params }: { params: { token: string } }) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('verificar_entrega', { p_token: params.token });
  const info = Array.isArray(data) ? data[0] : data;

  return (
    <div className="w-full max-w-sm card p-8">
      <h1 className="text-lg font-bold text-brand mb-1">Corporación Zona Lacustre</h1>
      <p className="text-sm text-neutral-500 mb-6">Verificación de envío de suministración</p>

      {!info || error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          No se encontró información para este código. El envío puede no existir o el link estar
          incompleto.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <Fila label="Código de envío" value={info.codigo} />
          <Fila label="Socio" value={info.socio_nombre} />
          <Fila label="RUT" value={info.socio_rut} />
          <Fila label="Estado de membresía" value={info.socio_estado} capitalize />
          <Fila label="N.º de receta" value={info.numero_receta} />
          <Fila label="Vigencia de receta" value={info.vigencia_receta} />
          <Fila label="Fecha del envío" value={new Date(info.fecha_hora).toLocaleString('es-CL')} />
          <Fila label="Cantidad" value={info.cantidad_g ? `${info.cantidad_g} g` : null} />
          <Fila label="Destino" value={info.destino} />
          <Fila label="Lote" value={info.lote_codigo} />
          <Fila label="Variedad" value={info.variedad} />
          <Fila label="Banco de semillas" value={info.banco_semillas} />
          <Fila label="% THC" value={info.thc_pct} />
          <Fila label="% CBD" value={info.cbd_pct} />
        </div>
      )}

      <p className="mt-6 text-xs text-neutral-400">
        Este comprobante solo confirma la identidad del solicitante y los datos del envío, conforme
        al Manual Interno de la Corporación. No expone antecedentes médicos ni el expediente
        clínico del socio.
      </p>
    </div>
  );
}

function Fila({ label, value, capitalize }: { label: string; value: string | number | null | undefined; capitalize?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2 border-b border-neutral-100 pb-2">
      <p className="text-neutral-500">{label}</p>
      <p className={`font-medium text-right ${capitalize ? 'capitalize' : ''}`}>{value ?? '—'}</p>
    </div>
  );
}
