import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

async function signIn(formData: FormData) {
  'use server';
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/dashboard');
}

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="w-full max-w-sm card p-8">
      <h1 className="text-lg font-bold text-brand mb-1">Corporación Zona Lacustre</h1>
      <p className="text-sm text-neutral-500 mb-6">Sistema de Gestión Institucional</p>
      {searchParams?.error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {searchParams.error}
        </p>
      )}
      <form action={signIn} className="space-y-4">
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
      <p className="mt-6 text-xs text-neutral-400">
        Las cuentas son creadas por la Secretaría de la Corporación. Si no tienes acceso, contáctala.
      </p>
    </div>
  );
}
