-- Storage RLS for the private `documents` bucket.
--
-- Recorded here because `storage.objects` is a Supabase-managed table and can't
-- live in the Drizzle schema (see lib/db/schema.ts + drizzle/ for the documents
-- and chunks table RLS). Applied to the remote project as migration
-- `20260701092527_storage_documents_rls`.
--
-- Upload path is `{userId}/{uuid}-{filename}`, so the first folder segment is the
-- owner's id. storage.objects already has RLS enabled by Supabase; these policies
-- scope every operation to the authenticated user's own folder.
--
-- Idempotent: safe to re-run.

drop policy if exists "documents_objects_select_own" on storage.objects;
create policy "documents_objects_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "documents_objects_insert_own" on storage.objects;
create policy "documents_objects_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "documents_objects_update_own" on storage.objects;
create policy "documents_objects_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "documents_objects_delete_own" on storage.objects;
create policy "documents_objects_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
