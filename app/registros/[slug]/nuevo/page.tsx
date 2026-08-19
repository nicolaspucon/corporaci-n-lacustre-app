import { createClient } from '@/lib/supabase/server';
import { getEntity } from '@/lib/entities';
import { calcularPlantasActivas } from '@/lib/plantasActivas';
import EntityForm from '@/components/EntityForm';
import { notFound } from 'next/navigation';

export default async function NuevoRegistroPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { error?: string };
}) {
  const entity = getEntity(params.slug);
  if (!entity) notFound();

  const supabase = createClient();
  const needsLote = entity.fields.some((f) => f.type === 'lote');
  const needsPlanta = entity.fields.some((f) => f.type === 'planta');

  const [lotesRes, plantasRes] = await Promise.all([
    needsLote ? supabase.from('lotes').select('id, codigo, cultivo_genetica').order('codigo', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    needsPlanta ? supabase.from('plantas').select('id, codigo').order('codigo', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
  ]);

  const loteOptions = (lotesRes.data ?? []).map((l: any) => ({ id: l.id, label: `${l.codigo}${l.cultivo_genetica ? ' — ' + l.cultivo_genetica : ''}` }));
  const plantaOptions = (plantasRes.data ?? []).map((p: any) => ({ id: p.id, label: p.codigo }));

  // El Control de Plantas Activas se alimenta solo: en vez de contar a mano,
  // se prellena con el conteo automático (lotes + madres + esquejes) y el
  // equipo técnico solo confirma/firma.
  let defaults: Record<string, unknown> | undefined;
  if (entity.slug === 'plantas-activas') {
    const resumen = await calcularPlantasActivas(supabase);
    defaults = {
      plantas_activas: resumen.totalActivas,
      plantas_cosechadas_acum: resumen.procesadoAcumulado,
      mermas_acum: resumen.mermasAcumuladas,
    };
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Nuevo: {entity.label}</h1>
      <p className="text-sm text-neutral-500 mb-6">{entity.manualRef}</p>
      <EntityForm entity={entity} loteOptions={loteOptions} plantaOptions={plantaOptions} error={searchParams?.error} defaults={defaults} />
    </div>
  );
}
