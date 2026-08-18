-- =====================================================================
-- ROW LEVEL SECURITY — Corporación de Usuarios Medicinales de Cannabis
-- Zona Lacustre. Ejecutar después de schema.sql.
--
-- Modelo de acceso (Manual Interno, Capítulo III):
--   admin, directorio, secretaria, direccion_tecnica -> acceso total de lectura/escritura
--   comite_seguridad   -> lectura general + escritura en incidentes, visitas, traslados
--   comite_calidad     -> lectura general + escritura en auditorías/no conformidades
--   tesoreria          -> lectura de socios/entregas (sin datos médicos sensibles) + escritura en lo propio
--   socio              -> lectura/escritura SOLO de sus propios datos (ficha, documentos, solicitudes)
-- =====================================================================

alter table profiles enable row level security;
alter table socios enable row level security;
alter table fichas_perfil enable row level security;
alter table expediente_items enable row level security;
alter table socio_documentos enable row level security;
alter table firmas enable row level security;
alter table lotes enable row level security;
alter table plantas enable row level security;
alter table registros_riego enable row level security;
alter table registros_fertilizacion enable row level security;
alter table registros_fitosanitario enable row level security;
alter table registros_manejo_agricola enable row level security;
alter table registros_ambiental enable row level security;
alter table registros_cosecha enable row level security;
alter table registros_secado enable row level security;
alter table registros_curado enable row level security;
alter table registros_almacenamiento enable row level security;
alter table registros_inventario enable row level security;
alter table control_plantas_activas enable row level security;
alter table eliminacion_material enable row level security;
alter table registro_ingreso_visitas enable row level security;
alter table incidentes enable row level security;
alter table no_conformidades enable row level security;
alter table auditorias enable row level security;
alter table solicitudes_suministro enable row level security;
alter table entregas enable row level security;
alter table traslados enable row level security;

-- ---------- Función auxiliar: rol del usuario autenticado ----------
create or replace function auth_rol() returns rol_usuario as $$
  select rol from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function auth_socio_id() returns uuid as $$
  select socio_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function es_staff() returns boolean as $$
  select auth_rol() in ('admin','directorio','secretaria','direccion_tecnica');
$$ language sql stable security definer;

-- ---------- profiles ----------
create policy "profiles: ver propio o staff" on profiles for select
  using (id = auth.uid() or es_staff());
create policy "profiles: staff administra" on profiles for all
  using (es_staff()) with check (es_staff());

-- ---------- socios ----------
create policy "socios: staff ve y edita todo" on socios for all
  using (es_staff()) with check (es_staff());
create policy "socios: socio ve su propio registro" on socios for select
  using (id = auth_socio_id());

-- ---------- fichas_perfil (datos médicos sensibles: Manual Cap. XI) ----------
create policy "ficha: staff clinico" on fichas_perfil for all
  using (auth_rol() in ('admin','direccion_tecnica','secretaria')) with check (auth_rol() in ('admin','direccion_tecnica','secretaria'));
create policy "ficha: socio ve la suya" on fichas_perfil for select
  using (socio_id = auth_socio_id());

-- ---------- expediente_items / socio_documentos / firmas ----------
create policy "expediente: staff" on expediente_items for all using (es_staff()) with check (es_staff());
create policy "expediente: socio ve el suyo" on expediente_items for select using (socio_id = auth_socio_id());

create policy "documentos: staff" on socio_documentos for all using (es_staff()) with check (es_staff());
create policy "documentos: socio ve y sube los suyos" on socio_documentos for select using (socio_id = auth_socio_id());
create policy "documentos: socio inserta los suyos" on socio_documentos for insert with check (socio_id = auth_socio_id());

create policy "firmas: staff" on firmas for all using (es_staff()) with check (es_staff());
create policy "firmas: socio ve y crea las suyas" on firmas for select using (socio_id = auth_socio_id());
create policy "firmas: socio inserta las suyas" on firmas for insert with check (socio_id = auth_socio_id() or socio_id is null);

-- ---------- Área agrícola: lectura amplia para roles internos, escritura para staff técnico ----------
create policy "agricola lectura staff" on lotes for select using (es_staff() or auth_rol() in ('comite_seguridad','comite_calidad'));
create policy "agricola escritura staff" on lotes for insert with check (es_staff());
create policy "agricola update staff" on lotes for update using (es_staff());
create policy "agricola delete staff" on lotes for delete using (es_staff());

create policy "plantas lectura" on plantas for select using (es_staff() or auth_rol() in ('comite_seguridad','comite_calidad'));
create policy "plantas escritura" on plantas for insert with check (es_staff());
create policy "plantas update" on plantas for update using (es_staff());
create policy "plantas delete" on plantas for delete using (es_staff());

-- Registros operativos: mismo patrón para todas las tablas de registro de cultivo
do $$
declare t text;
begin
  foreach t in array array[
    'registros_riego','registros_fertilizacion','registros_fitosanitario',
    'registros_manejo_agricola','registros_ambiental','registros_cosecha',
    'registros_secado','registros_curado','registros_almacenamiento',
    'registros_inventario','control_plantas_activas','eliminacion_material'
  ]
  loop
    execute format('create policy "%1$s select" on %1$s for select using (es_staff() or auth_rol() in (''comite_seguridad'',''comite_calidad''));', t);
    execute format('create policy "%1$s insert" on %1$s for insert with check (es_staff());', t);
    execute format('create policy "%1$s update" on %1$s for update using (es_staff());', t);
    execute format('create policy "%1$s delete" on %1$s for delete using (es_staff());', t);
  end loop;
end $$;

-- ---------- Seguridad / incidentes / auditoría ----------
create policy "visitas todo staff+seguridad" on registro_ingreso_visitas for all
  using (es_staff() or auth_rol() = 'comite_seguridad') with check (es_staff() or auth_rol() = 'comite_seguridad');

create policy "incidentes lectura" on incidentes for select using (es_staff() or auth_rol() in ('comite_seguridad','comite_calidad'));
create policy "incidentes escritura" on incidentes for insert with check (es_staff() or auth_rol() = 'comite_seguridad');
create policy "incidentes update" on incidentes for update using (es_staff() or auth_rol() = 'comite_seguridad');

create policy "no_conformidades todo" on no_conformidades for all
  using (es_staff() or auth_rol() = 'comite_calidad') with check (es_staff() or auth_rol() = 'comite_calidad');

create policy "auditorias todo" on auditorias for all
  using (es_staff() or auth_rol() = 'comite_calidad') with check (es_staff() or auth_rol() = 'comite_calidad');

-- ---------- Suministración ----------
create policy "solicitudes: staff ve todo" on solicitudes_suministro for select using (es_staff());
create policy "solicitudes: socio ve las suyas" on solicitudes_suministro for select using (socio_id = auth_socio_id());
create policy "solicitudes: socio crea las suyas" on solicitudes_suministro for insert with check (socio_id = auth_socio_id());
create policy "solicitudes: staff resuelve" on solicitudes_suministro for update using (es_staff());

create policy "entregas: staff todo" on entregas for all using (es_staff()) with check (es_staff());
create policy "entregas: socio ve las suyas" on entregas for select using (socio_id = auth_socio_id());

-- ---------- Transporte ----------
create policy "traslados: staff y seguridad" on traslados for all
  using (es_staff() or auth_rol() = 'comite_seguridad') with check (es_staff() or auth_rol() = 'comite_seguridad');
