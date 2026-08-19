import { requireAdmin, ROL_LABELS, type Rol } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import UsuarioForm from '@/components/admin/UsuarioForm';
import DeleteUsuarioButton from '@/components/admin/DeleteUsuarioButton';

export default async function UsuariosPage() {
  await requireAdmin();
  const supabase = createClient();

  const [{ data: profiles }, { data: socios }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nombre_completo, rol, activo, created_at, socio_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('socios')
      .select('id, nombre_completo, cus')
      .eq('estado', 'activo')
      .order('nombre_completo'),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-brand mb-1">Usuarios</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Crea accesos para nuevos socios o equipo técnico/directivo. Cada persona necesita un
        usuario propio para entrar al sistema.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <UsuarioForm socios={socios ?? []} />

        <div className="card p-6">
          <h2 className="font-semibold text-brand mb-4">Usuarios existentes</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {(profiles ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b border-neutral-100 pb-2 text-sm gap-3"
              >
                <div>
                  <p className="font-medium">{p.nombre_completo}</p>
                  <p className="text-neutral-500">{ROL_LABELS[p.rol as Rol] ?? p.rol}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!p.activo && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      Inactivo
                    </span>
                  )}
                  <DeleteUsuarioButton id={p.id} nombre={p.nombre_completo} />
                </div>
              </div>
            ))}
            {(profiles ?? []).length === 0 && (
              <p className="text-sm text-neutral-400">Todavía no hay usuarios registrados.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
