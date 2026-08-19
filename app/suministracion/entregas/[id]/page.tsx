import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import SignaturePad from '@/components/SignaturePad';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function EntregaDetallePage({ params }: { params: { id: string } }) {
  await requireStaff();
  const supabase = createClient();

  const [{ data: entrega }, { data: firmas }, { data: traslados }] = await Promise.all([
    supabase
      .from('entregas')
      .select('*, socio:socios(cus, nombre_completo), lote:lotes(codigo)')
      .eq('id', params.id)
      .single(),
    supabase.from('firmas').select('*').eq('contexto', 'entrega').eq('referencia_id', params.id),
    supabase.from('traslados').select('id, codigo').eq('entrega_id', params.id).limit(1),
  ]);

  if (!entrega) notFound();
  const yaTieneTraslado = (traslados ?? []).length > 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand mb-1">Entrega {entrega.codigo}</h1>
          <p className="text-sm text-neutral-500">
            {(entrega.socio as any)?.cus} — {(entrega.socio as any)?.nombre_completo} ·{' '}
            {new Date(entrega.fecha_hora).toLocaleString('es-CL')}
          </p>
        </div>
        <Link href={`/suministracion/entregas/${entrega.id}/rotulo`} className="btn-secondary text-sm whitespace-nowrap">
          Ver rótulo de transporte
        </Link>
      </div>

      <div className="card p-5 text-sm space-y-1">
        <p><span className="text-neutral-500">Lote de origen:</span> {(entrega.lote as any)?.codigo ?? '—'}</p>
        <p><span className="text-neutral-500">Cantidad entregada:</span> {entrega.cantidad_g ?? '—'} g</p>
        <p><span className="text-neutral-500">Destino:</span> {entrega.destino ?? '—'}</p>
        <p><span className="text-neutral-500">Observaciones:</span> {entrega.observaciones ?? '—'}</p>
      </div>

      {entrega.destino && !yaTieneTraslado && (
        <div className="card p-6 bg-amber-50 border border-amber-200">
          <p className="text-sm mb-3">
            Esta entrega tiene un destino registrado. ¿Corresponde generar el traslado hacia allá?
          </p>
          <Link
            href={`/transporte/nuevo?entrega_id=${entrega.id}&destino=${encodeURIComponent(entrega.destino)}&lote_id=${entrega.lote_id ?? ''}&cantidad=${encodeURIComponent(entrega.cantidad_g ? entrega.cantidad_g + ' g' : '')}`}
            className="btn-primary text-sm"
          >
            Generar traslado
          </Link>
        </div>
      )}

      {yaTieneTraslado && (
        <p className="text-sm text-brand bg-brand-pale rounded px-3 py-2">
          Ya existe un traslado registrado para esta entrega ({traslados![0].codigo}).
        </p>
      )}

      <section>
        <h2 className="font-semibold text-brand mb-3">Firma de recepción</h2>
        {(firmas ?? []).length > 0 ? (
          <p className="text-sm text-brand bg-brand-pale rounded px-3 py-2">
            Recepción firmada por {firmas![0].firmante_nombre} el{' '}
            {new Date(firmas![0].created_at).toLocaleString('es-CL')}.
          </p>
        ) : (
          <SignaturePad
            contexto="entrega"
            referenciaId={entrega.id}
            socioId={entrega.socio_id}
            firmanteNombreDefault={(entrega.socio as any)?.nombre_completo}
          />
        )}
      </section>
    </div>
  );
}
