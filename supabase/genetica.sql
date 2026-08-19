-- Datos genéticos/de origen que faltaban: % THC, % CBD y banco de semillas
-- (marca). Se cargan una vez en el origen (madre o lote) y de ahí se copian
-- solas a esquejes, plantas, y a los lugares donde se necesitan (rótulo de
-- transporte, verificación pública por QR).

alter table plantas_madre add column if not exists banco_semillas text;
alter table plantas_madre add column if not exists thc_pct numeric;
alter table plantas_madre add column if not exists cbd_pct numeric;

alter table esquejes add column if not exists banco_semillas text;
alter table esquejes add column if not exists thc_pct numeric;
alter table esquejes add column if not exists cbd_pct numeric;

alter table lotes add column if not exists banco_semillas text;
alter table lotes add column if not exists thc_pct numeric;
alter table lotes add column if not exists cbd_pct numeric;

alter table plantas add column if not exists banco_semillas text;
alter table plantas add column if not exists thc_pct numeric;
alter table plantas add column if not exists cbd_pct numeric;

-- Amplía la verificación pública por QR para incluir lote, variedad y potencia
-- (información del producto, no es un dato médico/sensible).
drop function if exists public.verificar_entrega(text);

create function public.verificar_entrega(p_token text)
returns table (
  codigo text,
  fecha_hora timestamptz,
  cantidad_g numeric,
  destino text,
  socio_nombre text,
  socio_rut text,
  socio_estado estado_socio,
  numero_receta text,
  vigencia_receta date,
  lote_codigo text,
  variedad text,
  thc_pct numeric,
  cbd_pct numeric,
  banco_semillas text
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
    f.vigencia_receta,
    l.codigo,
    l.cultivo_genetica,
    l.thc_pct,
    l.cbd_pct,
    l.banco_semillas
  from entregas e
  join socios s on s.id = e.socio_id
  left join fichas_perfil f on f.socio_id = s.id
  left join lotes l on l.id = e.lote_id
  where e.verificacion_token = p_token;
$$;

grant execute on function public.verificar_entrega(text) to anon, authenticated;
