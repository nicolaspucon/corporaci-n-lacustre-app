import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase con permisos de administrador (service_role).
// SOLO debe usarse en Server Actions / código de servidor, nunca en el navegador.
// Requiere la variable de entorno SUPABASE_SERVICE_ROLE_KEY (clave secreta,
// distinta de la "anon key" pública), configurada solo en Vercel/entorno local,
// nunca expuesta con el prefijo NEXT_PUBLIC_.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor.'
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
