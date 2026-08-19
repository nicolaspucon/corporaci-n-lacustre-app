import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import { calcularPlantasActivas } from '@/lib/plantasActivas';
import { calcularStockInventario } from '@/lib/inventario';
import Link from 'next/link';

export default async function DashboardPage() {
  const profile = await getSessionProfile();
  const supabase = createClient();

  if (profile?.rol === 'socio') {
    return <PanelSocio profile={profile} />;
  }

  const [{ count: socios }, { count: lotes }, { count: incidentesAbiertos }, { count: solicitudesPendientes }, resumenPlantas, resumenStock] =
    await Promise.all([
      supabase.from('socios').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
      supabase.from('lotes').select('*', { count: 'exact', head: true }).not('estado', 'in', '(cerrado)'),
      supabase.from('incidentes').select('*', { count: 'exact', head: true }).neq('estado', 'cerrado'),
      supabase.from('solicitudes_suministro').select('*', { count: 'exact', head: true }).eq('resolucion', 'pendiente'),
      calcularPlantasActivas(supabase),
      calcularStockInventario(supabase),
    ]);

  const stats = [
    { label: 'Socios activos', value: socios ?? 0, href: '/socios' },
    { label: 'Lotes en curso', value: lotes ?? 0, href: '/agricola/lotes' },
    { label: 'Plantas activas', value: resumenPlantas.totalActivas, href: '/registros/plantas-activas' },
    { label: 'Stock disponible (g)', value: resumenStock.totalDisponible, href: '/registros/inventario' },
    { label: 'Incidentes abiertos', value: incidentesAbiertos ?? 0, href: '/registros/incidentes' },
    { label: 'Solicitudes pendientes', value: solicitudesPendientes ?? 0, href: '/suministracion/solicitudes' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Panel general</h1>
      <p className="text-neutral-500 mb-6">Corporación de Usuarios Medicinales de Cannabis Zona Lacustre.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 hover:border-brand">
            <p className="text-3xl font-bold text-brand">{s.value}</p>
            <p className="text-sm text-neutral-500 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

async function PanelSocio({ profile }: { profile: any }) {
  const supabase = createClient();

  if (!profile.socio_id) {
    return (
      <div>
        <h1 className="text-xl font-bold text-brand mb-1">Hola, {profile.nombre_completo}</h1>
        <p className="text-neutral-500">
          Tu cuenta todavía no está vinculada a una ficha de socio. Contacta a Secretaría.
        </p>
      </div>
    );
  }

  const inicioMes = new Date();
  inicioMes.setDate(1);
  const inicioMesStr = inicioMes.toISOString().slice(0, 10);

  const [{ data: socio }, { data: ficha }, { data: entregasMes }, { data: solicitudesMes }, { data: documentos }, { data: entregasTotal }] =
    await Promise.all([
      supabase.from('socios').select('estado, categoria').eq('id', profile.socio_id).maybeSingle(),
      supabase
        .from('fichas_perfil')
        .select('rango_maximo_g, consumo_mensual_estimado_g, vigencia_receta')
        .eq('socio_id', profile.socio_id)
        .maybeSingle(),
      supabase.from('entregas').select('cantidad_g, fecha_hora').eq('socio_id', profile.socio_id).gte('fecha_hora', inicioMesStr),
      supabase.from('solicitudes_suministro').select('cantidad_solicitada_g, fecha').eq('socio_id', profile.socio_id).gte('fecha', inicioMesStr),
      supabase.from('socio_documentos').select('tipo, vigencia_hasta').eq('socio_id', profile.socio_id).not('vigencia_hasta', 'is', null),
      supabase.from('entregas').select('id').eq('socio_id', profile.socio_id),
    ]);

  const habilitado = socio?.estado === 'activo';

  const recibidoMes = (entregasMes ?? []).reduce((sum, e) => sum + (Number(e.cantidad_g) || 0), 0);
  const solicitadoMes = (solicitudesMes ?? []).reduce((sum, s) => sum + (Number(s.cantidad_solicitada_g) || 0), 0);
  const tope = ficha?.rango_maximo_g ?? ficha?.consumo_mensual_estimado_g ?? null;
  const pctConsumo = tope ? Math.min(100, Math.round((recibidoMes / tope) * 100)) : null;

  const vencimientos: { label: string; fecha: string }[] = [];
  if (ficha?.vigencia_receta) vencimientos.push({ label: 'Receta médica', fecha: ficha.vigencia_receta });
  for (const d of documentos ?? []) {
    if (d.vigencia_hasta) vencimientos.push({ label: d.tipo?.replace(/_/g, ' ') ?? 'Documento', fecha: d.vigencia_hasta });
  }
  vencimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proximosVencimientos = vencimientos.slice(0, 3);
  const hoyStr = new Date().toISOString().slice(0, 10);

  // Entregas pendientes de firmar (comprobante de recibo conforme).
  const idsEntregas = (entregasTotal ?? []).map((e) => e.id);
  let pendientesFirma = 0;
  if (idsEntregas.length > 0) {
    const { data: firmasEntregas } = await supabase
      .from('firmas')
      .select('referencia_id')
      .eq('contexto', 'entrega')
      .in('referencia_id', idsEntregas);
    const firmadas = new Set((firmasEntregas ?? []).map((f) => f.referencia_id));
    pendientesFirma = idsEntregas.filter((id) => !firmadas.has(id)).length;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-brand mb-1">Hola, {profile.nombre_completo}</h1>
          <p className="text-neutral-500">Bienvenido/a al sistema de gestión de la Corporación.</p>
        </div>
        <span
          className={
            habilitado
              ? 'text-sm font-semibold text-brand bg-brand-pale rounded-full px-4 py-1.5'
              : 'text-sm font-semibold text-red-600 bg-red-50 rounded-full px-4 py-1.5'
          }
        >
          {habilitado ? 'Habilitado' : 'Deshabilitado'}
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-neutral-500">Tope mensual autorizado</p>
          <p className="text-2xl font-bold text-brand mt-1">{tope ? `${tope} g` : 'No definido'}</p>
          {!tope && <p className="text-xs text-neutral-400 mt-1">Dirección Técnica aún no define tu tope.</p>}
        </div>
        <div className="card p-5">
          <p className="text-sm text-neutral-500">Recibido este mes</p>
          <p className="text-2xl font-bold text-brand mt-1">{recibidoMes} g</p>
          {pctConsumo !== null && (
            <div className="mt-2 h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={pctConsumo >= 100 ? 'h-full bg-red-500' : 'h-full bg-brand'}
                style={{ width: `${pctConsumo}%` }}
              />
            </div>
          )}
        </div>
        <div className="card p-5">
          <p className="text-sm text-neutral-500">Solicitado este mes</p>
          <p className="text-2xl font-bold text-brand mt-1">{solicitadoMes} g</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-brand mb-2">Próximas fechas a vencer</h2>
        {proximosVencimientos.length === 0 ? (
          <p className="text-sm text-neutral-400">No tienes documentos con vigencia registrada.</p>
        ) : (
          <div className="card divide-y">
            {proximosVencimientos.map((v, i) => {
              const vencido = v.fecha < hoyStr;
              return (
                <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                  <p className="capitalize">{v.label}</p>
                  <span className={vencido ? 'text-red-600 font-medium' : 'text-neutral-500'}>
                    {vencido ? 'Vencida el ' : 'Vence el '}
                    {new Date(v.fecha).toLocaleDateString('es-CL')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/suministracion/solicitudes/nuevo" className="card p-5 hover:border-brand">
          <p className="font-semibold text-brand">Solicitar dispensación</p>
          <p className="text-sm text-neutral-500 mt-1">Genera una nueva solicitud de suministro interno.</p>
        </Link>
        <Link href="/suministracion/entregas" className="card p-5 hover:border-brand">
          <p className="font-semibold text-brand">Mis entregas</p>
          <p className="text-sm text-neutral-500 mt-1">
            {pendientesFirma > 0
              ? `Tienes ${pendientesFirma} comprobante(s) de recibo pendiente(s) de firmar.`
              : 'Revisa el historial de tus entregas recibidas.'}
          </p>
        </Link>
        <Link href="/mi-perfil" className="card p-5 hover:border-brand sm:col-span-2">
          <p className="font-semibold text-brand">Mi ficha y expediente</p>
          <p className="text-sm text-neutral-500 mt-1">Revisa tu estado de socio y los documentos de tu expediente.</p>
        </Link>
      </div>
    </div>
  );
}
