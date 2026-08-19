-- Automatizaciones: número de receta, destino de entrega, y verificación
-- pública por QR para rótulos de transporte.

alter table fichas_perfil add column if not exists numero_receta text;
alter table entregas add column if not exists destino text;

-- Token largo y no adivinable para el link del QR de cada entrega.
alter table entregas add column if not exists verificacion_token text;

update entregas
set verificacion_token = replace(uuid_generate_v4()::text, '-', '') || replace(uuid_generate_v4()::text, '-', '')
where verificacion_token is null;

alter table entregas
  alter column verificacion_token
  set default (replace(uuid_generate_v4()::text, '-', '') || replace(uuid_generate_v4()::text, '-', ''));

alter table entregas alter column verificacion_token set not null;

create unique index if not exists entregas_verificacion_token_idx on entregas (verificacion_token);

-- Función pública (sin login) para verificar un envío escaneando el QR del
-- rótulo. Expone SOLO lo necesario para fiscalización: identidad del socio,
-- estado de membresía, número y vigencia de receta, y los datos de ESE envío.
-- No expone diagnóstico, médico tratante, dosis ni el expediente clínico.
create or replace function public.verificar_entrega(p_token text)
returns table (
  codigo text,
  fecha_hora timestamptz,
  cantidad_g numeric,
  destino text,
  socio_nombre text,
  socio_rut text,
  socio_estado estado_socio,
  numero_receta text,
  vigencia_receta date
)
language sql
security definer
set search_path = public
as $$
  select
    e.codigo,
    e.fecha_hora,
    e.cantidad_g,
    e.destino,
    s.nombre_completo,
    s.rut,
    s.estado,
    f.numero_receta,
    f.vigencia_receta
  from entregas e
  join socios s on s.id = e.socio_id
  left join fichas_perfil f on f.socio_id = s.id
  where e.verificacion_token = p_token;
$$;

grant execute on function public.verificar_entrega(text) to anon, authenticated;
