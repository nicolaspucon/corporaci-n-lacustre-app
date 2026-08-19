import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import { getEntity, getResponsableColumn } from '@/lib/entities';
import { eliminarRegistro } from '@/lib/actions/registros';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import SignaturePad from '@/components/SignaturePad';
import { notFound } from 'next/navigation';

export default async function RegistroDetallePage({
  params,
  searchParams,
}: {
  params: { slug: string; id: string };
  searchParams?: { error?: string };
}) {
  const entity = getEntity(params.slug);
  if (!entity) notFound();

  const profile = await getSessionProfile();
  const supabase = createClient();

  const relations: string[] = [];
  if (entity.fields.some((f) => f.type === 'lote')) relations.push('lote:lotes(codigo)');
  if (entity.fields.some((f) => f.type === 'planta')) relations.push('planta:plantas(codigo)');
  const responsableCol = getResponsableColumn(entity);
  if (responsableCol) relations.push(`resp_join:profiles!${responsableCol}(nombre_completo)`);
  const selectStr = ['*', ...relations].join(', ');

  const [{ data: registro }, { data: firmas }] = await Promise.all([
    supabase.from(entity.table).select(selectStr).eq('id', params.id).maybeSingle(),
    supabase
      .from('firmas')
      .select('*')
      .eq('contexto', entity.table)
      .eq('referencia_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  if (!registro) notFound();

  const r = registro as any;
  const firma = (firmas ?? [])[0] ?? null;

  const fotoField = entity.fields.find((f) => f.type === 'photo');
  let fotoUrl: string | null = null;
  if (fotoField && r[`${fotoField.key}_path`]) {
    const { data: signed } = await supabase.storage
      .from('documentos')
      .createSignedUrl(r[`${fotoField.key}_path`], 3600);
    fotoUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand mb-1">{entity.label}</h1>
        <p className="text-sm text-neutral-500">{entity.manualRef}</p>
      </div>

      {searchParams?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {searchParams.error}
        </p>
      )}

      <div className="card p-6 space-y-3">
        {entity.fields
          .filter((f) => f.type !== 'photo')
          .map((f) => {
            let value: any;
            if (f.type === 'lote' || f.type === 'planta') value = r[f.key]?.codigo;
            else if (f.type === 'boolean') value = r[f.key] ? 'Sí' : 'No';
            else value = r[f.key];
            return (
              <div key={f.key} className="grid grid-cols-3 gap-2 text-sm">
                <p className="text-neutral-500">{f.label}</p>
                <p className="col-span-2 font-medium">
                  {value !== null && value !== undefined && value !== '' ? String(value) : '—'}
                </p>
              </div>
            );
          })}
        {responsableCol && (
          <div className="grid grid-cols-3 gap-2 text-sm border-t border-neutral-100 pt-3">
            <p className="text-neutral-500">Registrado por</p>
            <p className="col-span-2 font-medium">{r.resp_join?.nombre_completo ?? '—'}</p>
          </div>
        )}
      </div>

      {fotoField && (
        <div className="card p-6">
          <h2 className="font-semibold text-brand mb-3">Fotografía de respaldo</h2>
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt="Fotografía de respaldo" className="max-w-full rounded-md border border-neutral-200" />
          ) : (
            <p className="text-sm text-neutral-400">No se adjuntó fotografía.</p>
          )}
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold text-brand mb-3">Firma</h2>
        {firma ? (
          <p className="text-sm text-brand bg-brand-pale rounded px-3 py-2">
            Firmado por {firma.firmante_nombre} — {new Date(firma.created_at).toLocaleString('es-CL')}.
          </p>
        ) : (
          <SignaturePad
            contexto={entity.table}
            referenciaId={params.id}
            firmanteNombreDefault={profile?.nombre_completo}
          />
        )}
      </div>

      <form action={eliminarRegistro} className="pt-2">
        <input type="hidden" name="__slug" value={entity.slug} />
        <input type="hidden" name="id" value={params.id} />
        <ConfirmSubmitButton
          confirmText="¿Eliminar este registro? Esta acción no se puede deshacer."
          className="text-sm text-red-600 hover:underline"
        >
          Eliminar registro
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
