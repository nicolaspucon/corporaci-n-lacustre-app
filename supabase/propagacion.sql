-- Propagación de material vegetal: Madres y Esquejes, separados de los Lotes
-- (que ahora representan solo el ciclo de Vegetación/Floración con plantas ya
-- seleccionadas). También agrega columnas que faltaban en "plantas" y "lotes".

create sequence if not exists md_seq start 1;
create sequence if not exists esq_seq start 1;

-- Plantas madre: se mantienen permanentemente en vegetativo, no pertenecen a
-- ningún lote ni siguen el ciclo germinación/floración/cosecha.
create table if not exists plantas_madre (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique default ('MD-' || lpad(nextval('md_seq')::text, 4, '0')),
  variedad text not null,
  fecha_inicio date not null default current_date,
  estado text not null default 'activa', -- activa | retirada
  ubicacion text,
  observaciones text,
  responsable uuid references profiles(id),
  created_at timestamptz not null default now()
);

comment on table plantas_madre is 'Plantas madre mantenidas en vegetativo para extracción de esquejes.';

-- Planilla de esquejado: cuántos esquejes se sacaron por variedad, cuántos
-- enraizaron sanos y cuántos se perdieron. Todavía no son un Lote.
create table if not exists esquejes (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique default ('ESQ-' || to_char(now(),'YYYY') || '-' || lpad(nextval('esq_seq')::text, 3, '0')),
  madre_id uuid references plantas_madre(id),
  variedad text not null,
  fecha date not null default current_date,
  cantidad_realizados integer not null,
  cantidad_enraizadas integer,
  cantidad_perdidas integer,
  estado text not null default 'enraizamiento', -- enraizamiento | listo | pasado_a_lote | descartado
  lote_id uuid references lotes(id),
  observaciones text,
  responsable uuid references profiles(id),
  created_at timestamptz not null default now()
);

comment on table esquejes is 'Planilla de esquejado (propagación): registro de esquejes tomados y su resultado de enraizamiento, previo a convertirse en un Lote.';

-- Trazabilidad: de qué tanda de esquejes proviene un lote (si corresponde).
alter table lotes add column if not exists origen_esqueje_id uuid references esquejes(id);

-- Datos que ya existían en el lote pero no se copiaban a cada planta.
alter table plantas add column if not exists produccion_esperada_g numeric;

alter table plantas_madre enable row level security;
alter table esquejes enable row level security;

create policy "madres lectura" on plantas_madre for select using (es_staff() or auth_rol() in ('comite_seguridad','comite_calidad'));
create policy "madres escritura" on plantas_madre for insert with check (es_staff());
create policy "madres update" on plantas_madre for update using (es_staff());
create policy "madres delete" on plantas_madre for delete using (es_staff());

create policy "esquejes lectura" on esquejes for select using (es_staff() or auth_rol() in ('comite_seguridad','comite_calidad'));
create policy "esquejes escritura" on esquejes for insert with check (es_staff());
create policy "esquejes update" on esquejes for update using (es_staff());
create policy "esquejes delete" on esquejes for delete using (es_staff());
