import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import FileUpload from '@/components/FileUpload';
import SignaturePad from '@/components/SignaturePad';
import { redirect } from 'next/navigation';

export default async function MiPerfilPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');
  if (!profile.socio_id) {
    return (
      <div className="card p-6 max-w-xl">
        <p className="text-sm text-neutral-600">
          Tu cuenta todavía no está vinculada a una ficha de socio. Contacta a Secretaría para completar
          tu incorporación.
        </p>
      </div>
    );
  }

  const supabase = createClient();

  const [{ data: socio }, { data: ficha }, { data: checklist }, { data: documentos }] = await Promise.all([
    supabase.from('socios').select('*').eq('id', profile.socio_id).single(),
    supabase.from('fichas_perfil').select('*').eq('socio_id', profile.socio_id).maybeSingle(),
    supabase.from('expediente_items').select('*').eq('socio_id', profile.socio_id).order('codigo'),
    supabase.from('socio_documentos').select('*').eq('socio_id', profile.socio_id).order('created_at', { ascending: false }),
  ]);

  if (!socio) redirect('/dashboard');

  const completados = (checklist ?? []).filter((c) => c.completado).length;
  const total = (checklist ?? []).length;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-brand mb-1">Mi ficha — {socio.cus}</h1>
        <p className="text-sm text-neutral-500">
          Estado: <span className="capitalize">{socio.estado}</span> · Categoría: {socio.categoria}
        </p>
      </div>

      <section>
        <h2 className="font-semibold text-brand mb-1">Mi expediente de incorporación</h2>
        <p className="text-sm text-neutral-500 mb-3">
          {completados} de {total} documentos completos.
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

      <section>
        <h2 className="font-semibold text-brand mb-3">Subir documento (receta, cédula, certificado, etc.)</h2>
        <FileUpload socioId={socio.id} />
      </section>

      <section>
        <h2 className="font-semibold text-brand mb-3">Mis documentos subidos</h2>
        <div className="card divide-y">
          {(documentos ?? []).length === 0 && (
            <p className="px-4 py-6 text-sm text-neutral-500 text-center">Sin documentos subidos todavía.</p>
          )}
          {(documentos ?? []).map((d) => (
            <div key={d.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{d.tipo}</p>
                <p className="text-xs text-neutral-400">{d.nombre_archivo}</p>
              </div>
              <p className="text-xs text-neutral-400">{new Date(d.created_at).toLocaleDateString('es-CL')}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-brand mb-3">Firmar documentos del expediente</h2>
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

      {ficha && (
        <section>
          <h2 className="font-semibold text-brand mb-3">Mi Ficha de Perfil y Consumo (FS-001)</h2>
          <div className="card p-5 text-sm space-y-1">
            <p><span className="text-neutral-500">Diagnóstico:</span> {ficha.diagnostico_principal ?? '—'}</p>
            <p><span className="text-neutral-500">Médico tratante:</span> {ficha.medico_tratante ?? '—'}</p>
            <p><span className="text-neutral-500">Vigencia receta:</span> {ficha.vigencia_receta ?? '—'}</p>
            <p><span className="text-neutral-500">Dosis diaria:</span> {ficha.dosis_diaria_g ?? '—'} g</p>
            <p><span className="text-neutral-500">Consumo mensual estimado:</span> {ficha.consumo_mensual_estimado_g ?? '—'} g</p>
            <p><span className="text-neutral-500">Plantas asignadas:</span> {ficha.n_plantas_asignadas ?? '—'} ({ficha.codigos_planta ?? 'sin códigos aún'})</p>
            <p className="text-xs text-neutral-400 pt-2">
              Estos datos son ingresados y validados por Dirección Técnica / Secretaría a partir de tu receta médica.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
