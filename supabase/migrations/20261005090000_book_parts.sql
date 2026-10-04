-- Long books are split into parts; the parts of one book share collection_id and appear as one folder.
alter table public.books
  add column if not exists collection_id uuid,
  add column if not exists collection_title text,
  add column if not exists part smallint,
  add column if not exists part_count smallint;

create index if not exists books_owner_collection_idx on public.books(owner_id, collection_id);
