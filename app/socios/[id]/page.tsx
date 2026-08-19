import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { guardarFichaPerfil, actualizarEstadoSocio, eliminarSocio } from '@/lib/actions/socios';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import FileUpload from '@/components/FileUpload';
import SignaturePad from '@/components/SignaturePad';
import { notFound } from 'next/navigation';

const ESTADOS = ['activo', 'suspendido', 'renunciado', 'excluido'];

export default async function SocioDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const [{ data: socio }, { data: ficha }, { data: checklist }, { data: documentos }] = await Promise.all([
    supabase.from('socios').select('*').eq('id', params.id).single(),
    supabase.from('fichas_perfil').select('*').eq('socio_id', params.id).maybeSingle(),
    supabase.from('expediente_items').select('*').eq('socio_id', params.id).order('codigo'),
    supabase.from('socio_documentos').select('*').eq('socio_id', params.id).order('created_at', { ascending: false }),
  ]);

  if (!socio) notFound();

  const documentosConUrl = await Promise.all(
    (documentos ?? []).map(async (d) => {
      const { data: signed } = await supabase.storage.from('documentos').createSignedUrl(d.storage_path, 3600);
      return { ...d, url: signed?.signedUrl ?? null };
    })
  );

  const completados = (checklist ?? []).filter((c) => c.completado).length;
  const total = (checklist ?? []).length;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        {searchParams?.error && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {searchParams.error}
          </p>
        )}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-brand">
            {socio.nombre_completo} <span className="text-neutral-400 font-normal">— {socio.cus}</span>
          </h1>
          <div className="flex items-center gap-3">
            <form action={actualizarEstadoSocio} className="flex items-center gap-2">
              <input type="hidden" name="socio_id" value={socio.id} />
              <select name="estado" defaultValue={socio.estado} className="input py-1 text-sm w-auto">
                {ESTADOS.map((e) => (
                  <option key={e} value={e} className="capitalize">
                    {e}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-secondary text-sm">
                Actualizar estado
              </button>
            </form>
            <form action={eliminarSocio}>
              <input type="hidden" name="id" value={socio.id} />
              <ConfirmSubmitButton
                confirmText={`¿Eliminar a "${socio.nombre_completo}" (${socio.cus})? Esta acción no se puede deshacer.`}
                className="text-sm text-red-600 hover:underline"
              >
                Eliminar socio
              </ConfirmSubmitButton>
            </form>
          </div>
        </div>
        <p className="text-sm text-neutral-500">
          RUT: {socio.rut ?? '—'} · Categoría: {socio.categoria} · Ingreso: {socio.fecha_ingreso}
        </p>
      </div>

      {/* Expediente checklist */}
      <section>
        <h2 className="font-semibold text-brand mb-1">Expediente de Incorporación (IDX-001)</h2>
        <p className="text-sm text-neutral-500 mb-3">
          {completados} de {total} ítems completados — Manual Interno 4.16
        </p>
        <div className="card divide-y">
          {(checklist ?? []).map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{item.nombre}</p>
                <p className="text-xs text-neutral-400">{item.codigo}</p>
              </div>
              <span
                className={
                  item.completado
                    ? 'text-xs font-semibold text-brand bg-brand-pale rounded-full px-3 py-1'
                    : 'text-xs font-semibold text-red-600 bg-red-50 rounded-full px-3 py-1'
                }
              >
                {item.completado ? 'Completo' : 'Pendiente'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Upload de documentos */}
      <section>
        <h2 className="font-semibold text-brand mb-3">Escanear / subir documento al expediente</h2>
        <FileUpload socioId={socio.id} />
      </section>

      {/* Documentos ya subidos */}
      <section>
        <h2 className="font-semibold text-brand mb-3">Documentos del expediente</h2>
        <div className="card overflow-x-auto">
          <table className="data-table w-full border-collapse">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Archivo</th>
                <th>Vigencia hasta</th>
                <th>Subido</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documentosConUrl.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-neutral-500 py-6">
                    Sin documentos subidos todavía.
                  </td>
                </tr>
              )}
              {documentosConUrl.map((d) => (
                <tr key={d.id}>
                  <td>{d.tipo}</td>
                  <td>{d.nombre_archivo ?? '—'}</td>
                  <td>{d.vigencia_hasta ?? '—'}</td>
                  <td>{new Date(d.created_at).toLocaleDateString('es-CL')}</td>
                  <td>
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-brand underline">
                        Ver
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Firma en pantalla de los documentos del expediente */}
      <section>
        <h2 className="font-semibold text-brand mb-3">Firma en pantalla</h2>
        <p className="text-sm text-neutral-500 mb-3">
          Para dejar constancia inmediata de la firma del Contrato de Adhesión, la Declaración de Coherencia
          y la Declaración Jurada. No reemplaza los documentos físicos/escaneados que deben subirse arriba.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-sm font-semibold mb-2">CTR-001 — Contrato de Adhesión</p>
            <SignaturePad contexto="CTR-001" socioId={socio.id} firmanteNombreDefault={socio.nombre_completo} />
          </div>
          <div className="card p-4">
            <p className="text-sm font-semibold mb-2">DC-001 — Declaración de Coherencia</p>
            <SignaturePad contexto="DC-001" socioId={socio.id} firmanteNombreDefault={socio.nombre_completo} />
          </div>
          <div className="card p-4">
            <p className="text-sm font-semibold mb-2">DJ-001 — Declaración Jurada</p>
            <SignaturePad contexto="DJ-001" socioId={socio.id} firmanteNombreDefault={socio.nombre_completo} />
          </div>
        </div>
      </section>

      {/* Ficha de Perfil y Consumo (FS-001) */}
      <section>
        <h2 className="font-semibold text-brand mb-3">Ficha de Perfil y Consumo (FS-001)</h2>
        <form action={guardarFichaPerfil} className="card p-6 space-y-4">
          <input type="hidden" name="socio_id" value={socio.id} />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Diagnóstico principal</label>
              <input className="input" name="diagnostico_principal" defaultValue={ficha?.diagnostico_principal ?? ''} />
            </div>
            <div>
              <label className="label">Médico tratante</label>
              <input className="input" name="medico_tratante" defaultValue={ficha?.medico_tratante ?? ''} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Especialidad</label>
              <input className="input" name="especialidad" defaultValue={ficha?.especialidad ?? ''} />
            </div>
            <div>
              <label className="label">Vía de administración</label>
              <input className="input" name="via_administracion" defaultValue={ficha?.via_administracion ?? ''} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Fecha de receta</label>
              <input className="input" type="date" name="fecha_receta" defaultValue={ficha?.fecha_receta ?? ''} />
            </div>
            <div>
              <label className="label">Vigencia de la receta</label>
              <input className="input" type="date" name="vigencia_receta" defaultValue={ficha?.vigencia_receta ?? ''} />
            </div>
            <div>
              <label className="label">Duración del tratamiento</label>
              <input className="input" name="duracion_tratamiento" defaultValue={ficha?.duracion_tratamiento ?? ''} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Dosis diaria (g)</label>
              <input className="input" type="number" step="0.01" name="dosis_diaria_g" defaultValue={ficha?.dosis_diaria_g ?? ''} />
            </div>
            <div>
              <label className="label">Frecuencia diaria</label>
              <input className="input" type="number" name="frecuencia_diaria" defaultValue={ficha?.frecuencia_diaria ?? ''} />
            </div>
            <div>
              <label className="label">Consumo mensual estimado (g)</label>
              <input className="input" type="number" step="0.01" name="consumo_mensual_estimado_g" defaultValue={ficha?.consumo_mensual_estimado_g ?? ''} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Rango mínimo mensual (g)</label>
              <input className="input" type="number" step="0.01" name="rango_minimo_g" defaultValue={ficha?.rango_minimo_g ?? ''} />
            </div>
            <div>
              <label className="label">Rango máximo mensual (g)</label>
              <input className="input" type="number" step="0.01" name="rango_maximo_g" defaultValue={ficha?.rango_maximo_g ?? ''} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Variedad / genética asignada</label>
              <input className="input" name="variedad_genetica" defaultValue={ficha?.variedad_genetica ?? ''} />
            </div>
            <div>
              <label className="label">N° de plantas asignadas</label>
              <input className="input" type="number" name="n_plantas_asignadas" defaultValue={ficha?.n_plantas_asignadas ?? ''} />
            </div>
          </div>

          <div>
            <label className="label">Códigos de planta (CP-) asignados</label>
            <input className="input" name="codigos_planta" defaultValue={ficha?.codigos_planta ?? ''} placeholder="CP-000001, CP-000002…" />
          </div>

          <div>
            <label className="label">Observaciones técnicas</label>
            <textarea className="input" name="observaciones_tecnicas" rows={3} defaultValue={ficha?.observaciones_tecnicas ?? ''} />
          </div>

          <button type="submit" className="btn-primary">
            Guardar ficha
          </button>
        </form>
      </section>
    </div>
  );
}
