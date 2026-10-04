create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text not null default 'Моя библиотека',
  format text not null,
  progress smallint not null default 0 check (progress between 0 and 100),
  original_path text not null,
  content_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists books_owner_created_idx on public.books(owner_id, created_at desc);
alter table public.books enable row level security;

create policy "Read own books" on public.books
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Insert own books" on public.books
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own books" on public.books
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Delete own books" on public.books
  for delete to authenticated using ((select auth.uid()) = owner_id);

create table if not exists public.saved_words (
  id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  translation text not null,
  book_title text not null,
  known boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (owner_id, id),
  unique (owner_id, word)
);

create index if not exists saved_words_owner_created_idx on public.saved_words(owner_id, created_at desc);
alter table public.saved_words enable row level security;

create policy "Read own saved words" on public.saved_words
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Insert own saved words" on public.saved_words
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own saved words" on public.saved_words
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Delete own saved words" on public.saved_words
  for delete to authenticated using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-files',
  'book-files',
  false,
  104857600,
  array['application/epub+zip', 'application/pdf', 'text/plain', 'text/markdown']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Read own book files" on storage.objects
  for select to authenticated using (
    bucket_id = 'book-files' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Upload own book files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'book-files' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Update own book files" on storage.objects
  for update to authenticated using (
    bucket_id = 'book-files' and (storage.foldername(name))[1] = (select auth.uid())::text
  ) with check (
    bucket_id = 'book-files' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Delete own book files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'book-files' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
