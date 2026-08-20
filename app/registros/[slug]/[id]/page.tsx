import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import { getEntity, getResponsableColumn } from '@/lib/entities';
import { anularRegistro, confirmarIngreso, actualizarRegistro } from '@/lib/actions/registros';
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
  relations.push('anulador:profiles!anulado_por(nombre_completo)');
  relations.push('editor:profiles!updated_by(nombre_completo)');
  const selectStr = ['*', ...relations].join(', ');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: registro }, { data: firmas }, { data: visitaHoy }] = await Promise.all([
    supabase.from(entity.table).select(selectStr).eq('id', params.id).maybeSingle(),
    supabase
      .from('firmas')
      .select('*')
      .eq('contexto', entity.table)
      .eq('referencia_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1),
    entity.implicaIngreso && user
      ? supabase
          .from('registro_ingreso_visitas')
          .select('id')
          .eq('autorizado_por', user.id)
          .eq('fecha', new Date().toISOString().slice(0, 10))
          .limit(1)
      : Promise.resolve({ data: null as any[] | null }),
  ]);

  if (!registro) notFound();

  const r = registro as any;
  const firma = (firmas ?? [])[0] ?? null;
  const anulado = !!r.anulado_en;

  const fotoField = entity.fields.find((f) => f.type === 'photo' && !f.faseFinal);
  let fotoUrl: string | null = null;
  if (fotoField && r[`${fotoField.key}_path`]) {
    const { data: signed } = await supabase.storage
      .from('documentos')
      .createSignedUrl(r[`${fotoField.key}_path`], 3600);
    fotoUrl = signed?.signedUrl ?? null;
  }

  // Campos de "etapa final" (ej. fecha de término, peso final) que todavía no se han llenado.
  const camposFaseFinal = entity.fields.filter((f) => f.faseFinal);
  const camposFaseFinalPendientes = camposFaseFinal.filter((f) => {
    const col = f.type === 'lote' || f.type === 'planta' ? `${f.key}_id` : f.key;
    const val = r[col];
    return val === null || val === undefined || val === '';
  });

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

      {anulado && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          Registro anulado el {new Date(r.anulado_en).toLocaleString('es-CL')} por{' '}
          {r.anulador?.nombre_completo ?? '—'}. Motivo: {r.motivo_anulacion ?? '—'}
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
                <p className="text-neutral-500">
                  {f.label}
                  {f.faseFinal && <span className="text-neutral-400"> (etapa final)</span>}
                </p>
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
        {r.updated_at && (
          <div className="grid grid-cols-3 gap-2 text-sm border-t border-neutral-100 pt-3">
            <p className="text-neutral-500">Última edición</p>
            <p className="col-span-2 font-medium">
              {new Date(r.updated_at).toLocaleString('es-CL')} · {r.editor?.nombre_completo ?? '—'}
            </p>
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

      {!anulado && camposFaseFinalPendientes.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-brand mb-1">Completar {entity.label.toLowerCase()} — etapa final</h2>
          <p className="text-sm text-neutral-500 mb-4">
            Estos datos recién se saben al terminar el proceso. Complétalos cuando corresponda.
          </p>
          <form action={actualizarRegistro} className="space-y-4">
            <input type="hidden" name="__slug" value={entity.slug} />
            <input type="hidden" name="__id" value={params.id} />

            {camposFaseFinalPendientes.map((field) => (
              <div key={field.key}>
                <label className="label" htmlFor={field.key}>
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>

                {field.type === 'textarea' && (
                  <textarea className="input" id={field.key} name={field.key} rows={3} required={field.required} />
                )}

                {field.type === 'boolean' && (
                  <input className="h-4 w-4" id={field.key} name={field.key} type="checkbox" />
                )}

                {field.type === 'photo' && (
                  <input
                    className="input"
                    id={field.key}
                    name={field.key}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    required={field.required}
                  />
                )}

                {['text', 'number', 'date', 'time', 'datetime-local'].includes(field.type) && (
                  <input
                    className="input"
                    id={field.key}
                    name={field.key}
                    type={field.type}
                    step={field.type === 'number' ? 'any' : undefined}
                    required={field.required}
                  />
                )}
              </div>
            ))}

            <button type="submit" className="btn-primary">
              Guardar etapa final
            </button>
          </form>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold text-brand mb-3">Firma</h2>
        {firma ? (
          <p className="text-sm text-brand bg-brand-pale rounded px-3 py-2">
            Firmado por {firma.firmante_nombre} — {new Date(firma.created_at).toLocaleString('es-CL')}.
          </p>
        ) : anulado ? (
          <p className="text-sm text-neutral-400">Registro anulado: no corresponde firmar.</p>
        ) : (
          <SignaturePad
            contexto={entity.table}
            referenciaId={params.id}
            firmanteNombreDefault={profile?.nombre_completo}
          />
        )}
      </div>

      {!anulado && entity.implicaIngreso && (!visitaHoy || visitaHoy.length === 0) && (
        <div className="card p-6">
          <h2 className="font-semibold text-brand mb-2">¿Registrar tu ingreso de hoy?</h2>
          <p className="text-sm text-neutral-500 mb-3">
            Este registro implica que ingresaste al área de cultivo. Confirma para dejarlo también
            en el Registro de Ingreso y Visitas (Manual 10.4).
          </p>
          <form action={confirmarIngreso} className="flex items-center gap-3">
            <input type="hidden" name="__slug" value={entity.slug} />
            <input type="hidden" name="__return" value={`/registros/${entity.slug}/${params.id}`} />
            <input
              className="input flex-1"
              name="motivo"
              defaultValue={`Registro agrícola: ${entity.label}`}
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              Confirmar ingreso
            </button>
          </form>
        </div>
      )}

      {!anulado && (
        <div className="pt-2">
          <h2 className="font-semibold text-red-700 mb-2 text-sm">Anular registro</h2>
          <p className="text-xs text-neutral-500 mb-2">
            No se elimina de la base de datos: queda oculto de la lista normal, pero se conserva con fecha,
            usuario y motivo para poder demostrarlo ante una fiscalización.
          </p>
          <form action={anularRegistro} className="flex items-start gap-3">
            <input type="hidden" name="__slug" value={entity.slug} />
            <input type="hidden" name="id" value={params.id} />
            <textarea
              className="input flex-1"
              name="motivo"
              rows={2}
              required
              placeholder="Motivo de la anulación (obligatorio)"
            />
            <ConfirmSubmitButton
              confirmText="¿Anular este registro? Quedará marcado como anulado y fuera de los cálculos, pero no se borra."
              className="text-sm text-red-600 hover:underline whitespace-nowrap pt-2"
            >
              Anular registro
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
