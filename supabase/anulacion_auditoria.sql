-- ============================================================
-- Implementa las recomendaciones del informe de auditoría de
-- trazabilidad:
--  1) Anulación (soft delete) en vez de eliminación permanente,
--     con motivo, fecha y usuario, en lotes/plantas/madres/
--     esquejes/socios y las 16 tablas de "Registro".
--  2) Historial de ediciones (updated_at / updated_by) en esas
--     mismas tablas.
--  3) Cierre controlado de incidentes (fecha_cierre +
--     verificación de eficacia).
--  4) Cantidad numérica en Eliminación de Material Vegetal.
--  5) Cierre del ciclo de Traslados / Entregas.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'lotes','plantas','plantas_madre','esquejes','socios',
    'registros_riego','registros_fertilizacion','registros_fitosanitario',
    'registros_manejo_agricola','registros_ambiental','registros_cosecha',
    'registros_secado','registros_curado','registros_almacenamiento',
    'registros_inventario','control_plantas_activas','eliminacion_material',
    'registro_ingreso_visitas','incidentes','no_conformidades','auditorias'
  ]
  loop
    execute format('alter table %I add column if not exists anulado_en timestamptz', t);
    execute format('alter table %I add column if not exists anulado_por uuid references profiles(id)', t);
    execute format('alter table %I add column if not exists motivo_anulacion text', t);
    execute format('alter table %I add column if not exists updated_at timestamptz', t);
    execute format('alter table %I add column if not exists updated_by uuid references profiles(id)', t);
  end loop;
end $$;

-- Ya no se usarán borrados físicos desde la app: se retiran los permisos de
-- DELETE a nivel de base de datos en las tablas que tenían una policy
-- dedicada para eso (defensa en profundidad).
drop policy if exists "agricola delete staff" on lotes;
drop policy if exists "plantas delete" on plantas;
drop policy if exists "madres delete" on plantas_madre;
drop policy if exists "esquejes delete" on esquejes;

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
    execute format('drop policy if exists "%1$s delete" on %1$s;', t);
  end loop;
end $$;

-- Cierre controlado de incidentes: requiere fecha de cierre y verificación
-- de eficacia (igual que no_conformidades, que ya los tenía).
alter table incidentes add column if not exists fecha_cierre date;
alter table incidentes add column if not exists verificacion_eficacia text;

-- Cantidad numérica (en gramos o unidades) para poder auditar el acumulado
-- de material eliminado automáticamente. Se deja el campo de texto original
-- como detalle/descripción libre.
alter table eliminacion_material add column if not exists cantidad_g numeric;

-- Cierre del ciclo de Traslados: estado del traslado, y si la entrega
-- asociada ya fue trasladada.
alter table traslados add column if not exists estado text not null default 'en_curso';
alter table entregas add column if not exists trasladado boolean not null default false;
