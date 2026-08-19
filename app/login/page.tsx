import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

async function signInSocio(formData: FormData) {
  'use server';
  const socioId = String(formData.get('socio_id') || '');
  const password = String(formData.get('password') || '');

  if (!socioId) {
    redirect('/login?error=' + encodeURIComponent('Selecciona tu nombre de la lista.'));
  }

  let email: string | null = null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(socioId);
    if (error || !data?.user?.email) {
      redirect('/login?error=' + encodeURIComponent('No se pudo identificar la cuenta seleccionada.'));
    }
    email = data!.user!.email!;
  } catch {
    redirect('/login?error=' + encodeURIComponent('No se pudo identificar la cuenta seleccionada.'));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email!, password });
  if (error) {
    redirect('/login?error=' + encodeURIComponent('Contraseña incorrecta.'));
  }
  redirect('/dashboard');
}

async function signInEquipo(formData: FormData) {
  'use server';
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?modo=equipo&error=${encodeURIComponent(error.message)}`);
  }
  redirect('/dashboard');
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; modo?: string };
}) {
  const modoEquipo = searchParams?.modo === 'equipo';

  let socios: { id: string; nombre_completo: string }[] = [];
  if (!modoEquipo) {
    const supabase = createClient();
    const { data } = await supabase.rpc('socios_para_login');
    socios = data ?? [];
  }

  return (
    <div className="w-full max-w-sm card p-8">
      <h1 className="text-lg font-bold text-brand mb-1">Corporación Zona Lacustre</h1>
      <p className="text-sm text-neutral-500 mb-6">Sistema de Gestión Institucional</p>

      {searchParams?.error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {searchParams.error}
        </p>
      )}

      {modoEquipo ? (
        <>
          <form action={signInEquipo} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Correo electrónico</label>
              <input className="input" id="email" name="email" type="email" required />
            </div>
            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <input className="input" id="password" name="password" type="password" required />
            </div>
            <button className="btn-primary w-full" type="submit">Ingresar</button>
          </form>
          <a href="/login" className="block mt-4 text-sm text-brand underline text-center">
            ← Soy socio
          </a>
        </>
      ) : (
        <>
          <form action={signInSocio} className="space-y-4">
            <div>
              <label className="label" htmlFor="socio_id">Selecciona tu nombre</label>
              <select className="input" id="socio_id" name="socio_id" defaultValue="" required>
                <option value="" disabled>— Elige tu nombre —</option>
                {socios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <input className="input" id="password" name="password" type="password" required />
            </div>
            <button className="btn-primary w-full" type="submit">Ingresar</button>
          </form>
          {socios.length === 0 && (
            <p className="mt-3 text-xs text-neutral-400">Todavía no hay socios con acceso creado.</p>
          )}
          <a href="/login?modo=equipo" className="block mt-4 text-sm text-neutral-500 underline text-center">
            Soy del equipo técnico
          </a>
        </>
      )}

      <p className="mt-6 text-xs text-neutral-400">
        Las cuentas son creadas por la Secretaría de la Corporación. Si no tienes acceso, contáctala.
      </p>
    </div>
  );
}
