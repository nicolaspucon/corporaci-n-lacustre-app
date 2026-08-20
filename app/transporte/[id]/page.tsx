import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { registrarLlegada } from '@/lib/actions/transporte';
import { notFound } from 'next/navigation';

export default async function TrasladoDetallePage({ params }: { params: { id: string } }) {
  await requireStaff();
  const supabase = createClient();

  const { data: traslado } = await supabase
    .from('traslados')
    .select('*, lote:lotes(codigo), entrega:entregas(codigo)')
    .eq('id', params.id)
    .single();

  if (!traslado) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-brand">Traslado {traslado.codigo}</h1>
          <span
            className={
              traslado.estado === 'completado'
                ? 'text-xs font-semibold text-brand bg-brand-pale rounded-full px-3 py-1'
                : 'text-xs font-semibold text-amber-700 bg-amber-50 rounded-full px-3 py-1'
            }
          >
            {traslado.estado === 'completado' ? 'Completado' : 'En curso'}
          </span>
        </div>
        <p className="text-sm text-neutral-500 capitalize">{traslado.tipo}</p>
      </div>

      <div className="card p-5 text-sm space-y-1">
        <p><span className="text-neutral-500">Origen:</span> {traslado.origen ?? '—'}</p>
        <p><span className="text-neutral-500">Destino:</span> {traslado.destino ?? '—'}</p>
        <p><span className="text-neutral-500">Vehículo:</span> {traslado.vehiculo_patente ?? '—'}</p>
        <p><span className="text-neutral-500">Salida:</span> {traslado.fecha_salida ? new Date(traslado.fecha_salida).toLocaleString('es-CL') : '—'}</p>
        <p><span className="text-neutral-500">Llegada:</span> {traslado.fecha_llegada ? new Date(traslado.fecha_llegada).toLocaleString('es-CL') : 'Pendiente'}</p>
        <p><span className="text-neutral-500">Lote:</span> {(traslado.lote as any)?.codigo ?? '—'}</p>
        <p>
          <span className="text-neutral-500">Entrega asociada:</span> {(traslado.entrega as any)?.codigo ?? '—'}
          {traslado.entrega_id && (
            <span className="text-xs text-neutral-400">
              {' '}
              ({traslado.fecha_llegada ? 'marcada como trasladada al registrar la llegada' : 'se marcará como trasladada al registrar la llegada'})
            </span>
          )}
        </p>
        <p><span className="text-neutral-500">Cantidad:</span> {traslado.cantidad ?? '—'}</p>
        <p><span className="text-neutral-500">Autorización:</span> {traslado.autorizacion ?? '—'}</p>
        <p><span className="text-neutral-500">Observaciones:</span> {traslado.observaciones ?? '—'}</p>
      </div>

      {!traslado.fecha_llegada && (
        <form action={registrarLlegada}>
          <input type="hidden" name="traslado_id" value={traslado.id} />
          <button type="submit" className="btn-primary">
            Registrar llegada ahora
          </button>
        </form>
      )}

      <div className="card p-4 bg-brand-pale text-sm text-neutral-700">
        <p className="font-semibold mb-1">Documentos que debe portar el transportista (Manual 7.19)</p>
        <p>Autorización interna de traslado, cédula de identidad del conductor, este comprobante de traslado
          ({traslado.codigo}), y si corresponde, copia de la receta médica o certificado del socio destinatario.</p>
      </div>
    </div>
  );
}
