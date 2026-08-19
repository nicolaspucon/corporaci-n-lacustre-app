-- Mejoras al módulo de Registros:
-- 1. Columna para guardar la foto de respaldo en Eliminación de Material Vegetal.
-- 2. Política de eliminación que faltaba para "incidentes" (las demás tablas de
--    registro ya la tenían desde rls.sql).

alter table eliminacion_material add column if not exists foto_path text;

drop policy if exists "incidentes delete" on incidentes;
create policy "incidentes delete" on incidentes for delete
  using (es_staff() or auth_rol() = 'comite_seguridad');
