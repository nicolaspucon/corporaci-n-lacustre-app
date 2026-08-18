import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import Link from 'next/link';

export default async function DashboardPage() {
  const profile = await getSessionProfile();
  const supabase = createClient();

  if (profile?.rol === 'socio') {
    return (
      <div>
        <h1 className="text-xl font-bold text-brand mb-1">Hola, {profile.nombre_completo}</h1>
        <p className="text-neutral-500 mb-6">Bienvenido/a al sistema de gestión de la Corporación.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/mi-perfil" className="card p-5 hover:border-brand">
            <p className="font-semibold text-brand">Mi ficha y expediente</p>
            <p className="text-sm text-neutral-500 mt-1">Revisa tu estado de socio y los documentos de tu expediente.</p>
          </Link>
          <Link href="/suministracion/solicitudes" className="card p-5 hover:border-brand">
            <p className="font-semibold text-brand">Solicitar suministro</p>
            <p className="text-sm text-neutral-500 mt-1">Genera una nueva solicitud de suministro interno.</p>
          </Link>
        </div>
      </div>
    );
  }

  const [{ count: socios }, { count: lotes }, { count: incidentesAbiertos }, { count: solicitudesPendientes }] =
    await Promise.all([
      supabase.from('socios').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
      supabase.from('lotes').select('*', { count: 'exact', head: true }).not('estado', 'in', '(cerrado)'),
      supabase.from('incidentes').select('*', { count: 'exact', head: true }).neq('estado', 'cerrado'),
      supabase.from('solicitudes_suministro').select('*', { count: 'exact', head: true }).eq('resolucion', 'pendiente'),
    ]);

  const stats = [
    { label: 'Socios activos', value: socios ?? 0, href: '/socios' },
    { label: 'Lotes en curso', value: lotes ?? 0, href: '/agricola/lotes' },
    { label: 'Incidentes abiertos', value: incidentesAbiertos ?? 0, href: '/registros/incidentes' },
    { label: 'Solicitudes pendientes', value: solicitudesPendientes ?? 0, href: '/suministracion/solicitudes' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Panel general</h1>
      <p className="text-neutral-500 mb-6">Corporación de Usuarios Medicinales de Cannabis Zona Lacustre.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
