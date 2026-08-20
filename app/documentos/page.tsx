import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: { socio?: string; tipo?: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const { data: socios } = await supabase.from('socios').select('id, cus, nombre_completo').order('cus');

  let query = supabase
    .from('socio_documentos')
    .select('id, tipo, nombre_archivo, vigencia_hasta, created_at, storage_path, socio:socios(id, cus, nombre_completo)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (searchParams?.socio) query = query.eq('socio_id', searchParams.socio);
  if (searchParams?.tipo) query = query.eq('tipo', searchParams.tipo);

  const { data: documentos, error } = await query;

  const documentosConUrl = await Promise.all(
    (documentos ?? []).map(async (d: any) => {
      const { data: signed } = await supabase.storage.from('documentos').createSignedUrl(d.storage_path, 3600);
      return { ...d, url: signed?.signedUrl ?? null };
    })
  );

  const hoy = new Date();
  const en30dias = new Date(hoy.getTime() + 30 * 86400000);

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Repositorio de documentos</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Todos los documentos escaneados/subidos por o para socios: cédulas, certificados de antecedentes,
        recetas médicas y los 6 documentos del expediente (ANX-ML-001, CTR-001, DC-001, DJ-001, FS-001, SOL-001).
      </p>

      <form className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Socio</label>
          <select className="input" name="socio" defaultValue={searchParams?.socio ?? ''}>
            <option value="">Todos</option>
            {(socios ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.cus} — {s.nombre_completo}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" name="tipo" defaultValue={searchParams?.tipo ?? ''}>
            <option value="">Todos</option>
            <option value="cedula_identidad">Cédula de identidad</option>
            <option value="certificado_antecedentes">Certificado de antecedentes</option>
            <option value="receta_medica">Receta médica</option>
            <option value="ficha_perfil_fs001">FS-001</option>
            <option value="declaracion_coherencia_dc001">DC-001</option>
            <option value="contrato_adhesion_ctr001">CTR-001</option>
            <option value="anexo_marco_legal_anxml001">ANX-ML-001</option>
            <option value="declaracion_jurada_dj001">DJ-001</option>
            <option value="solicitud_ingreso_sol001">SOL-001</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary">Filtrar</button>
      </form>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error.message}
        </p>
      )}

      {documentosConUrl.length === 0 ? (
        <div className="card p-8 text-center text-neutral-500 text-sm">Sin documentos que coincidan con el filtro.</div>
      ) : (
        <>
          {/* Móvil: tarjetas apiladas */}
          <div className="md:hidden space-y-3">
            {documentosConUrl.map((d) => {
              const vencido = d.vigencia_hasta && new Date(d.vigencia_hasta) < hoy;
              const porVencer = d.vigencia_hasta && !vencido && new Date(d.vigencia_hasta) <= en30dias;
              return (
                <div key={d.id} className="card p-4">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <p className="font-semibold text-brand">{d.socio?.cus} — {d.socio?.nombre_completo}</p>
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-brand underline text-sm shrink-0">
                        Ver
                      </a>
                    )}
                  </div>
                  <dl className="space-y-0.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-neutral-500 shrink-0">Tipo</dt>
                      <dd className="text-right">{d.tipo}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-neutral-500 shrink-0">Archivo</dt>
                      <dd className="text-right">{d.nombre_archivo ?? '—'}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-neutral-500 shrink-0">Vigencia</dt>
                      <dd className="text-right">
                        {d.vigencia_hasta ?? '—'}
                        {vencido && <span className="ml-2 text-xs font-semibold text-red-600">Vencido</span>}
                        {porVencer && <span className="ml-2 text-xs font-semibold text-amber-600">Por vencer</span>}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-neutral-500 shrink-0">Subido</dt>
                      <dd className="text-right">{new Date(d.created_at).toLocaleDateString('es-CL')}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block card overflow-x-auto">
            <table className="data-table w-full border-collapse">
              <thead>
                <tr>
                  <th>Socio</th>
                  <th>Tipo</th>
                  <th>Archivo</th>
                  <th>Vigencia</th>
                  <th>Subido</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documentosConUrl.map((d) => {
                  const vencido = d.vigencia_hasta && new Date(d.vigencia_hasta) < hoy;
                  const porVencer = d.vigencia_hasta && !vencido && new Date(d.vigencia_hasta) <= en30dias;
                  return (
                    <tr key={d.id}>
                      <td>{d.socio?.cus} — {d.socio?.nombre_completo}</td>
                      <td>{d.tipo}</td>
                      <td>{d.nombre_archivo ?? '—'}</td>
                      <td>
                        {d.vigencia_hasta ?? '—'}
                        {vencido && <span className="ml-2 text-xs font-semibold text-red-600">Vencido</span>}
                        {porVencer && <span className="ml-2 text-xs font-semibold text-amber-600">Por vencer</span>}
                      </td>
                      <td>{new Date(d.created_at).toLocaleDateString('es-CL')}</td>
                      <td>{d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-brand underline">Ver</a>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
