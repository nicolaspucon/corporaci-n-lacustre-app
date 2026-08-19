-- Automatiza el Registro de Inventario:
--  - Al completar la etapa final del Curado (peso_final_g), se genera solo una
--    "entrada" de stock disponible en registros_inventario.
--  - Los movimientos quedan vinculados a su lote (lote_id) para poder calcular
--    el saldo real disponible por lote/variedad, en vez de escribirlo a mano.
--  - origen_curado_id evita duplicar la entrada si se vuelve a guardar el
--    mismo registro de curado.

alter table registros_curado add column if not exists peso_final_g numeric;

alter table registros_inventario add column if not exists lote_id uuid references lotes(id);
alter table registros_inventario add column if not exists origen_curado_id uuid references registros_curado(id);
