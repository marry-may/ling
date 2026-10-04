alter table public.books
  add column if not exists language text not null default 'en';

alter table public.saved_words
  add column if not exists language text not null default 'en',
  add column if not exists context text not null default '',
  add column if not exists level smallint not null default 1 check (level between 1 and 4),
  add column if not exists due_at timestamptz not null default now();

alter table public.saved_words drop constraint if exists saved_words_owner_id_word_key;
alter table public.saved_words drop constraint if exists saved_words_owner_language_word_key;
alter table public.saved_words
  add constraint saved_words_owner_language_word_key unique (owner_id, language, word);

create table if not exists public.known_words (
  owner_id uuid not null references auth.users(id) on delete cascade,
  language text not null,
  word text not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, language, word)
);

alter table public.known_words enable row level security;

create policy "Read own known words" on public.known_words
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Insert own known words" on public.known_words
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Delete own known words" on public.known_words
  for delete to authenticated using ((select auth.uid()) = owner_id);
