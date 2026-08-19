import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import EsquejeForm from '@/components/EsquejeForm';

export default async function NuevoEsquejePage({
  searchParams,
}: {
  searchParams: { error?: string; madre_id?: string };
}) {
  await requireStaff();
  const supabase = createClient();

  const { data: madres } = await supabase
    .from('plantas_madre')
    .select('id, codigo, variedad, banco_semillas, thc_pct, cbd_pct')
    .eq('estado', 'activa')
    .order('codigo');

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Nuevo esquejado</h1>
      <p className="text-sm text-neutral-500 mb-6">
        El código ESQ- se genera automáticamente. Registra cuántos esquejes sacaste hoy; el resultado de
        enraizamiento se completa después, desde la ficha del esquejado.
      </p>

      <EsquejeForm madres={madres ?? []} defaultMadreId={searchParams?.madre_id} error={searchParams?.error} />
    </div>
  );
}
