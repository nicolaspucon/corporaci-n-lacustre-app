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
    <>
      {/* Checkbox oculto que controla el menú móvil (sin JavaScript). */}
      <input type="checkbox" id="nav-toggle" className="peer hidden" />

      {/* Barra superior fija, solo en móvil */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-brand text-white flex items-center justify-between px-2">
        <label
          htmlFor="nav-toggle"
          aria-label="Abrir menú"
          className="p-3 flex flex-col justify-center gap-1 cursor-pointer"
        >
          <span className="block w-6 h-0.5 bg-white" />
          <span className="block w-6 h-0.5 bg-white" />
          <span className="block w-6 h-0.5 bg-white" />
        </label>
        <p className="font-semibold text-sm pr-4">Corporación Zona Lacustre</p>
      </header>

      {/* Fondo oscuro al abrir el menú en móvil */}
      <label
        htmlFor="nav-toggle"
        aria-hidden="true"
        className="hidden peer-checked:block md:hidden fixed inset-0 bg-black/50 z-30"
      />

      <aside
        className="
          fixed md:static inset-y-0 left-0 z-40
          w-72 md:w-64 shrink-0 bg-brand text-white flex flex-col min-h-screen
          -translate-x-full peer-checked:translate-x-0 md:translate-x-0
          transition-transform duration-200 ease-in-out
        "
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-bold leading-tight">Corporación</p>
            <p className="text-sm text-white/70 leading-tight">Zona Lacustre</p>
          </div>
          <label htmlFor="nav-toggle" aria-label="Cerrar menú" className="md:hidden p-2 -mr-2 cursor-pointer text-white/80">
            ✕
          </label>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 text-sm">
          <NavLink href="/dashboard" label="Panel general" />

          {!isSocio && (
            <>
              <NavGroup label="Socios">
                <NavLink href="/socios" label="Listado de socios" />
                <NavLink href="/socios/nuevo" label="Nuevo socio" />
              </NavGroup>

              <NavGroup label="Propagación">
                <NavLink href="/agricola/madres" label="Madres" />
                <NavLink href="/agricola/esquejes" label="Esquejes" />
              </NavGroup>

              <NavGroup label="Área agrícola (floración)">
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
    </>
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
    <Link
      href={href}
      className="block px-5 py-2.5 md:py-1.5 text-white/85 hover:bg-white/10 hover:text-white active:bg-white/15"
    >
      {label}
    </Link>
  );
}
