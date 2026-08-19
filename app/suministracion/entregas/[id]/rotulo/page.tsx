import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import PrintButton from '@/components/PrintButton';
import Link from 'next/link';

export default async function RotuloEntregaPage({ params }: { params: { id: string } }) {
  await requireStaff();
  const supabase = createClient();

  const { data: entrega } = await supabase
    .from('entregas')
    .select('*, socio:socios(nombre_completo, rut), lote:lotes(codigo, cultivo_genetica, banco_semillas, thc_pct, cbd_pct)')
    .eq('id', params.id)
    .single();

  if (!entrega) notFound();

  const { data: ficha } = await supabase
    .from('fichas_perfil')
    .select('numero_receta, vigencia_receta')
    .eq('socio_id', entrega.socio_id)
    .maybeSingle();

  const host = headers().get('host');
  const proto = headers().get('x-forwarded-proto') ?? 'https';
  const verifyUrl = `${proto}://${host}/verificar/${entrega.verificacion_token}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(verifyUrl)}`;

  const socio = entrega.socio as any;
  const lote = entrega.lote as any;

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/suministracion/entregas/${entrega.id}`} className="text-sm text-brand underline">
          ← Volver a la entrega
        </Link>
        <PrintButton label="Imprimir rótulo" />
      </div>

      <div className="card p-8 border-2 border-brand">
        <p className="text-xs text-neutral-400 mb-1">Corporación Zona Lacustre — Rótulo de transporte</p>
        <h1 className="text-lg font-bold text-brand mb-4">Envío {entrega.codigo}</h1>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-6">
          <Campo label="Nombre" value={socio?.nombre_completo} />
          <Campo label="RUT" value={socio?.rut} />
          <Campo label="N.º de receta" value={ficha?.numero_receta} />
          <Campo label="Vigencia de receta" value={ficha?.vigencia_receta} />
          <Campo label="Fecha" value={new Date(entrega.fecha_hora).toLocaleDateString('es-CL')} />
          <Campo label="Destino" value={entrega.destino} />
          <Campo label="Cantidad" value={entrega.cantidad_g ? `${entrega.cantidad_g} g` : null} />
          <Campo label="Lote" value={lote?.codigo} />
          <Campo label="Variedad" value={lote?.cultivo_genetica} />
          <Campo label="Banco de semillas" value={lote?.banco_semillas} />
          <Campo label="% THC" value={lote?.thc_pct} />
          <Campo label="% CBD" value={lote?.cbd_pct} />
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-neutral-200 pt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="Código QR de verificación" width={160} height={160} />
          <p className="text-xs text-neutral-400 text-center">
            Escanea para verificar este envío (identidad del solicitante y vigencia de receta).
          </p>
        </div>
      </div>

      <p className="text-xs text-neutral-400 print:hidden">
        Pega o adhiere este rótulo al envase de transporte, conforme a lo exigido por el Manual
        Interno.
      </p>
    </div>
  );
}

function Campo({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-neutral-400 text-xs uppercase tracking-wide">{label}</p>
      <p className="font-medium">{value ?? '—'}</p>
    </div>
  );
}
