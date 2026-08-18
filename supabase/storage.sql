-- =====================================================================
-- STORAGE — Buckets y políticas
-- Ejecutar después de schema.sql y rls.sql
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('firmas', 'firmas', false)
on conflict (id) do nothing;

-- Solo usuarios autenticados (staff o el propio socio, validado en la app)
-- pueden leer/escribir. Como los nombres de archivo incluyen el socio_id,
-- se valida a nivel de aplicación; a nivel de bucket exigimos sesión activa.
create policy "documentos: solo autenticados leen" on storage.objects for select
  using (bucket_id = 'documentos' and auth.role() = 'authenticated');
create policy "documentos: solo autenticados suben" on storage.objects for insert
  with check (bucket_id = 'documentos' and auth.role() = 'authenticated');

create policy "firmas: solo autenticados leen" on storage.objects for select
  using (bucket_id = 'firmas' and auth.role() = 'authenticated');
create policy "firmas: solo autenticados suben" on storage.objects for insert
  with check (bucket_id = 'firmas' and auth.role() = 'authenticated');
