-- Permite mostrar un listado de nombres de socios en la pantalla de inicio de
-- sesión (sin exponer correos ni otros datos), para que el socio elija su
-- nombre en vez de escribir su correo. La función corre con permisos
-- elevados (security definer) y solo expone id + nombre de socios activos.

create or replace function public.socios_para_login()
returns table (id uuid, nombre_completo text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.nombre_completo
  from profiles p
  where p.rol = 'socio' and p.activo = true
  order by p.nombre_completo;
$$;

grant execute on function public.socios_para_login() to anon, authenticated;
