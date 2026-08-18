import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { ENTITIES } from '@/lib/entities';
import PrintButton from '@/components/PrintButton';
import Link from 'next/link';

const AGRICOLA_SLUGS = ['riego', 'fertilizacion', 'fitosanitario', 'manejo-agricola', 'ambiental', 'cosecha', 'secado', 'curado'];

export default async function FiscalizacionPage({
  searchParams,
}: {
  searchParams: { modo?: string; socio?: string; lote?: string };
}) {
  await requireStaff();
  const supabase = createClient();
  const modo = searchParams?.modo ?? 'general';

  const [{ data: socios }, { data: lotes }] = await Promise.all([
    supabase.from('socios').select('id, cus, nombre_completo').order('cus'),
    supabase.from('lotes').select('id, codigo').order('codigo', { ascending: false }),
  ]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-1 print:hidden">
        <h1 className="text-xl font-bold text-brand">Generar expediente para fiscalización</h1>
        <PrintButton />
      </div>
      <p className="text-sm text-neutral-500 mb-6 print:hidden">
        Compila la información del sistema en un formato listo para presentar ante una inspección
        (SEREMI de Salud, SAG, u otra autoridad fiscalizadora).
      </p>

      <div className="flex gap-2 mb-6 print:hidden">
        <Link href="/fiscalizacion?modo=general" className={modo === 'general' ? 'btn-primary' : 'btn-secondary'}>Resumen general</Link>
        <Link href="/fiscalizacion?modo=socio" className={modo === 'socio' ? 'btn-primary' : 'btn-secondary'}>Expediente por socio</Link>
        <Link href="/fiscalizacion?modo=lote" className={modo === 'lote' ? 'btn-primary' : 'btn-secondary'}>Expediente por lote</Link>
      </div>

      {modo === 'general' && <ResumenGeneral />}
      {modo === 'socio' && <ExpedienteSocio socios={socios ?? []} socioId={searchParams?.socio} />}
      {modo === 'lote' && <ExpedienteLote lotes={lotes ?? []} loteId={searchParams?.lote} />}
    </div>
  );
}

async function ResumenGeneral() {
  const supabase = createClient();

  const [
    { count: sociosActivos },
    { count: lotesActivos },
    { count: incidentesAbiertos },
    { data: checklists },
    { data: documentosVigencia },
  ] = await Promise.all([
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
    supabase.from('lotes').select('*', { count: 'exact', head: true }).not('estado', 'eq', 'cerrado'),
    supabase.from('incidentes').select('*', { count: 'exact', head: true }).neq('estado', 'cerrado'),
    supabase.from('expediente_items').select('socio_id, completado, socio:socios(cus, nombre_completo)').eq('completado', false),
    supabase.from('socio_documentos').select('tipo, vigencia_hasta, socio:socios(cus, nombre_completo)').not('vigencia_hasta', 'is', null),
  ]);

  const hoy = new Date();
  const en30dias = new Date(hoy.getTime() + 30 * 86400000);
  const vencidos = (documentosVigencia ?? []).filter((d: any) => new Date(d.vigencia_hasta) < hoy);
  const porVencer = (documentosVigencia ?? []).filter(
    (d: any) => new Date(d.vigencia_hasta) >= hoy && new Date(d.vigencia_hasta) <= en30dias
  );

  const sociosIncompletos = new Map<string, { cus: string; nombre: string; faltantes: number }>();
  for (const item of checklists ?? []) {
    const s: any = (item as any).socio;
    const key = item.socio_id;
    if (!sociosIncompletos.has(key)) {
      sociosIncompletos.set(key, { cus: s?.cus, nombre: s?.nombre_completo, faltantes: 0 });
    }
    sociosIncompletos.get(key)!.faltantes += 1;
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Socios activos" value={sociosActivos ?? 0} />
        <Stat label="Lotes en curso" value={lotesActivos ?? 0} />
        <Stat label="Incidentes abiertos" value={incidentesAbiertos ?? 0} />
        <Stat label="Documentos vencidos" value={vencidos.length} alert={vencidos.length > 0} />
      </div>

      <section>
        <h2 className="font-semibold text-brand mb-2">Expedientes de socio incompletos</h2>
        <div className="card divide-y">
          {sociosIncompletos.size === 0 && <p className="px-4 py-6 text-sm text-neutral-500 text-center">Todos los expedientes están completos.</p>}
          {[...sociosIncompletos.entries()].map(([id, s]) => (
            <div key={id} className="px-4 py-3 flex items-center justify-between text-sm">
              <span>{s.cus} — {s.nombre}</span>
              <span className="text-amber-600 font-semibold">{s.faltantes} ítem(s) pendiente(s)</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-brand mb-2">Documentos vencidos o por vencer (30 días)</h2>
        <div className="card divide-y">
          {vencidos.length === 0 && porVencer.length === 0 && (
            <p className="px-4 py-6 text-sm text-neutral-500 text-center">Sin documentos vencidos ni próximos a vencer.</p>
          )}
          {vencidos.map((d: any, i: number) => (
            <div key={'v' + i} className="px-4 py-3 flex items-center justify-between text-sm">
              <span>{d.socio?.cus} — {d.socio?.nombre_completo} ({d.tipo})</span>
              <span className="text-red-600 font-semibold">Vencido el {d.vigencia_hasta}</span>
            </div>
          ))}
          {porVencer.map((d: any, i: number) => (
            <div key={'p' + i} className="px-4 py-3 flex items-center justify-between text-sm">
              <span>{d.socio?.cus} — {d.socio?.nombre_completo} ({d.tipo})</span>
              <span className="text-amber-600 font-semibold">Vence el {d.vigencia_hasta}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

async function ExpedienteSocio({ socios, socioId }: { socios: { id: string; cus: string; nombre_completo: string }[]; socioId?: string }) {
  const supabase = createClient();

  return (
    <div className="space-y-6">
      <form className="print:hidden">
        <label className="label">Selecciona un socio</label>
        <select className="input max-w-md" name="socio" defaultValue={socioId ?? ''}>
          <option value="">— Selecciona —</option>
          {socios.map((s) => (
            <option key={s.id} value={s.id}>{s.cus} — {s.nombre_completo}</option>
          ))}
        </select>
        <input type="hidden" name="modo" value="socio" />
        <button type="submit" className="btn-secondary ml-2">Ver expediente</button>
      </form>

      {socioId && <DetalleSocio socioId={socioId} />}
    </div>
  );
}

async function DetalleSocio({ socioId }: { socioId: string }) {
  const supabase = createClient();
  const [{ data: socio }, { data: ficha }, { data: checklist }, { data: documentos }, { data: firmas }] = await Promise.all([
    supabase.from('socios').select('*').eq('id', socioId).single(),
    supabase.from('fichas_perfil').select('*').eq('socio_id', socioId).maybeSingle(),
    supabase.from('expediente_items').select('*').eq('socio_id', socioId).order('codigo'),
    supabase.from('socio_documentos').select('*').eq('socio_id', socioId).order('created_at', { ascending: false }),
    supabase.from('firmas').select('*').eq('socio_id', socioId).order('created_at', { ascending: false }),
  ]);

  if (!socio) return <p className="text-sm text-neutral-500">Socio no encontrado.</p>;

  const documentosConUrl = await Promise.all(
    (documentos ?? []).map(async (d) => {
      const { data: signed } = await supabase.storage.from('documentos').createSignedUrl(d.storage_path, 3600);
      return { ...d, url: signed?.signedUrl ?? null };
    })
  );

  return (
    <div className="space-y-6 border-t pt-6">
      <div>
        <h2 className="text-lg font-bold text-brand">{socio.nombre_completo} — {socio.cus}</h2>
        <p className="text-sm text-neutral-500">RUT {socio.rut ?? '—'} · Estado: {socio.estado} · Ingreso: {socio.fecha_ingreso}</p>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Checklist del expediente (IDX-001)</h3>
        <ul className="text-sm space-y-1">
          {(checklist ?? []).map((c) => (
            <li key={c.id}>{c.completado ? '✓' : '✗'} {c.nombre} ({c.codigo})</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Documentos</h3>
        <ul className="text-sm space-y-1">
          {(documentosConUrl ?? []).length === 0 && <li className="text-neutral-500">Sin documentos.</li>}
          {documentosConUrl.map((d) => (
            <li key={d.id}>
              {d.tipo} — {d.nombre_archivo}{' '}
              {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-brand underline print:hidden">Ver</a>}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Firmas registradas</h3>
        <ul className="text-sm space-y-1">
          {(firmas ?? []).length === 0 && <li className="text-neutral-500">Sin firmas registradas.</li>}
          {(firmas ?? []).map((f) => (
            <li key={f.id}>{f.contexto} — firmado por {f.firmante_nombre} el {new Date(f.created_at).toLocaleString('es-CL')}</li>
          ))}
        </ul>
      </div>

      {ficha && (
        <div>
          <h3 className="font-semibold mb-2">Ficha de Perfil y Consumo (FS-001)</h3>
          <p className="text-sm">Diagnóstico: {ficha.diagnostico_principal ?? '—'}</p>
          <p className="text-sm">Médico tratante: {ficha.medico_tratante ?? '—'}</p>
          <p className="text-sm">Vigencia de receta: {ficha.vigencia_receta ?? '—'}</p>
          <p className="text-sm">Consumo mensual estimado: {ficha.consumo_mensual_estimado_g ?? '—'} g</p>
          <p className="text-sm">Plantas asignadas: {ficha.n_plantas_asignadas ?? '—'} ({ficha.codigos_planta ?? '—'})</p>
        </div>
      )}
    </div>
  );
}

async function ExpedienteLote({ lotes, loteId }: { lotes: { id: string; codigo: string }[]; loteId?: string }) {
  return (
    <div className="space-y-6">
      <form className="print:hidden">
        <label className="label">Selecciona un lote</label>
        <select className="input max-w-md" name="lote" defaultValue={loteId ?? ''}>
          <option value="">— Selecciona —</option>
          {lotes.map((l) => (
            <option key={l.id} value={l.id}>{l.codigo}</option>
          ))}
        </select>
        <input type="hidden" name="modo" value="lote" />
        <button type="submit" className="btn-secondary ml-2">Ver expediente</button>
      </form>

      {loteId && <DetalleLote loteId={loteId} />}
    </div>
  );
}

async function DetalleLote({ loteId }: { loteId: string }) {
  const supabase = createClient();
  const { data: lote } = await supabase.from('lotes').select('*').eq('id', loteId).single();
  if (!lote) return <p className="text-sm text-neutral-500">Lote no encontrado.</p>;

  const conteos = await Promise.all(
    AGRICOLA_SLUGS.map(async (slug) => {
      const entity = ENTITIES.find((e) => e.slug === slug)!;
      const { count } = await supabase.from(entity.table).select('*', { count: 'exact', head: true }).eq('lote_id', loteId);
      return { label: entity.label, count: count ?? 0 };
    })
  );

  const [{ count: nPlantas }, { count: nEntregas }, { count: nTraslados }] = await Promise.all([
    supabase.from('plantas').select('*', { count: 'exact', head: true }).eq('lote_id', loteId),
    supabase.from('entregas').select('*', { count: 'exact', head: true }).eq('lote_id', loteId),
    supabase.from('traslados').select('*', { count: 'exact', head: true }).eq('lote_id', loteId),
  ]);

  return (
    <div className="space-y-6 border-t pt-6">
      <div>
        <h2 className="text-lg font-bold text-brand">Lote {lote.codigo}</h2>
        <p className="text-sm text-neutral-500">
          {lote.cultivo_genetica ?? '—'} · Inicio: {lote.fecha_inicio} · Estado: {lote.estado} · {nPlantas ?? 0} plantas registradas
        </p>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Registros de manejo agrícola</h3>
        <ul className="text-sm space-y-1">
          {conteos.map((c) => (
            <li key={c.label}>{c.label}: {c.count} registro(s)</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Trazabilidad</h3>
        <p className="text-sm">Entregas asociadas: {nEntregas ?? 0}</p>
        <p className="text-sm">Traslados asociados: {nTraslados ?? 0}</p>
      </div>
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="card p-4">
      <p className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-brand'}`}>{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
