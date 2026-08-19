import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import { crearSolicitud } from '@/lib/actions/suministracion';
import { redirect } from 'next/navigation';

const STAFF = ['admin', 'directorio', 'secretaria', 'direccion_tecnica'];

export default async function NuevaSolicitudPage({ searchParams }: { searchParams: { error?: string } }) {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');
  const isStaff = STAFF.includes(profile.rol);
  const supabase = createClient();

  let socios: { id: string; cus: string; nombre_completo: string }[] = [];
  if (isStaff) {
    const { data } = await supabase.from('socios').select('id, cus, nombre_completo').eq('estado', 'activo').order('cus');
    socios = data ?? [];
  }

  let contextoSocio: { tope: number | null; solicitadoMes: number } | null = null;
  if (!isStaff && profile.socio_id) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().slice(0, 10);
    const [{ data: ficha }, { data: solicitudesMes }] = await Promise.all([
      supabase
        .from('fichas_perfil')
        .select('rango_maximo_g, consumo_mensual_estimado_g')
        .eq('socio_id', profile.socio_id)
        .maybeSingle(),
      supabase
        .from('solicitudes_suministro')
        .select('cantidad_solicitada_g')
        .eq('socio_id', profile.socio_id)
        .gte('fecha', inicioMesStr),
    ]);
    contextoSocio = {
      tope: ficha?.rango_maximo_g ?? ficha?.consumo_mensual_estimado_g ?? null,
      solicitadoMes: (solicitudesMes ?? []).reduce((sum, s) => sum + (Number(s.cantidad_solicitada_g) || 0), 0),
    };
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Nueva solicitud de suministro</h1>
      <p className="text-sm text-neutral-500 mb-6">Manual Interno Cap. VIII</p>

      {contextoSocio && (
        <div className="card p-4 mb-4 max-w-2xl text-sm bg-brand-pale">
          <p>
            Llevas solicitados <strong>{contextoSocio.solicitadoMes} g</strong> este mes
            {contextoSocio.tope ? (
              <> de un tope autorizado de <strong>{contextoSocio.tope} g</strong>.</>
            ) : (
              '. Tu tope mensual aún no ha sido definido por Dirección Técnica.'
            )}
          </p>
        </div>
      )}

      <form action={crearSolicitud} className="card p-6 space-y-4 max-w-2xl">
        {searchParams?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {searchParams.error}
          </p>
        )}

        {isStaff && (
          <div>
            <label className="label" htmlFor="socio_id">Socio solicitante</label>
            <select className="input" id="socio_id" name="socio_id" required>
              <option value="">— Selecciona —</option>
              {socios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.cus} — {s.nombre_completo}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="fecha">Fecha</label>
            <input className="input" id="fecha" name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label" htmlFor="tipo_material">Tipo de material</label>
            <input className="input" id="tipo_material" name="tipo_material" placeholder="Flor seca, aceite, etc." />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="cantidad_solicitada_g">Cantidad solicitada (g)</label>
          <input className="input" id="cantidad_solicitada_g" name="cantidad_solicitada_g" type="number" step="0.01" />
        </div>

        <div>
          <label className="label" htmlFor="observaciones">Observaciones</label>
          <textarea className="input" id="observaciones" name="observaciones" rows={3} />
        </div>

        <button type="submit" className="btn-primary">
          Enviar solicitud
        </button>
      </form>
    </div>
  );
}
