import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ROL_LABELS, type Rol } from '@/lib/auth';
import { ENTITIES } from '@/lib/entities';

async function signOut() {
  'use server';
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

const STAFF: Rol[] = ['admin', 'directorio', 'secretaria', 'direccion_tecnica'];

export default function Sidebar({ profile }: { profile: any }) {
  const isStaff = STAFF.includes(profile.rol);
  const isSocio = profile.rol === 'socio';
  const isAdmin = profile.rol === 'admin';

  return (
    <aside className="w-64 shrink-0 bg-brand text-white flex flex-col min-h-screen">
      <div className="p-5 border-b border-white/10">
        <p className="font-bold leading-tight">Corporación</p>
        <p className="text-sm text-white/70 leading-tight">Zona Lacustre</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 text-sm">
        <NavLink href="/dashboard" label="Panel general" />

        {!isSocio && (
          <>
            <NavGroup label="Socios">
              <NavLink href="/socios" label="Listado de socios" />
              <NavLink href="/socios/nuevo" label="Nuevo socio" />
            </NavGroup>

            <NavGroup label="Área agrícola">
              <NavLink href="/agricola/planificacion" label="Planificación (Gantt)" />
              <NavLink href="/agricola/lotes" label="Lotes" />
              <NavLink href="/agricola/plantas" label="Plantas" />
              {ENTITIES.filter((e) =>
                ['riego', 'fertilizacion', 'fitosanitario', 'manejo-agricola', 'ambiental', 'cosecha', 'secado', 'curado'].includes(e.slug)
              ).map((e) => (
                <NavLink key={e.slug} href={`/registros/${e.slug}`} label={e.label} />
              ))}
            </NavGroup>

            <NavGroup label="Inventario y calidad">
              {ENTITIES.filter((e) =>
                ['almacenamiento', 'inventario', 'plantas-activas', 'eliminacion-material', 'no-conformidades', 'auditorias'].includes(e.slug)
              ).map((e) => (
                <NavLink key={e.slug} href={`/registros/${e.slug}`} label={e.label} />
              ))}
            </NavGroup>

            <NavGroup label="Suministración">
              <NavLink href="/suministracion/solicitudes" label="Solicitudes" />
              <NavLink href="/suministracion/entregas" label="Entregas" />
            </NavGroup>

            <NavGroup label="Seguridad y transporte">
              <NavLink href="/transporte" label="Traslados" />
              <NavLink href="/registros/visitas" label="Ingreso y visitas" />
              <NavLink href="/registros/incidentes" label="Incidentes" />
            </NavGroup>

            <NavGroup label="Documentos">
              <NavLink href="/documentos" label="Repositorio de documentos" />
              <NavLink href="/fiscalizacion" label="Generar expediente" />
            </NavGroup>

            {isAdmin && (
              <NavGroup label="Administración">
                <NavLink href="/admin/usuarios" label="Usuarios" />
              </NavGroup>
            )}
          </>
        )}

        {isSocio && (
          <NavGroup label="Mi cuenta">
            <NavLink href="/mi-perfil" label="Mi ficha y expediente" />
            <NavLink href="/suministracion/solicitudes" label="Mis solicitudes" />
            <NavLink href="/suministracion/entregas" label="Mis entregas" />
          </NavGroup>
        )}
      </nav>

      <div className="p-4 border-t border-white/10 text-xs">
        <p className="font-medium">{profile.nombre_completo}</p>
        <p className="text-white/60">{ROL_LABELS[profile.rol as Rol] ?? profile.rol}</p>
        <form action={signOut} className="mt-2">
          <button className="text-white/70 hover:text-white underline" type="submit">
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="px-5 mb-1 text-[11px] uppercase tracking-wide text-white/50 font-semibold">{label}</p>
      {children}
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block px-5 py-1.5 text-white/85 hover:bg-white/10 hover:text-white">
      {label}
    </Link>
  );
}
