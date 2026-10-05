-- Admin center: who may see it, the page views it counts, and the one function that reads the statistics.

-- Admins are listed here; no policy gives clients access, so only the functions below read it.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

insert into public.admins (user_id)
select id from auth.users where lower(email) = 'maria.sirovatka@gmail.com'
on conflict do nothing;

-- One row per page load of the site, the app or a Ling Library page. Visitors are an anonymous random id kept in
-- the browser; no IP addresses are stored. Anyone may add a row, nobody but admin_stats() reads them.
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor_id text not null check (length(visitor_id) between 8 and 64),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('landing', 'app', 'catalog', 'book')),
  path text not null check (length(path) <= 300),
  referrer text check (length(referrer) <= 300),
  device text check (device in ('mobile', 'desktop'))
);
create index if not exists page_views_created_idx on public.page_views(created_at desc);
alter table public.page_views enable row level security;

create policy "Record page views" on public.page_views
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- All admin-center numbers in one call. Raises for anyone who is not an admin.
-- The admins' own visits (any visitor id an admin ever used) are left out of the traffic numbers.
create or replace function public.admin_stats(days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  days := least(greatest(coalesce(days, 30), 1), 365);
  since := date_trunc('day', now()) - make_interval(days => days - 1);

  with
  admin_visitors as (
    select distinct visitor_id from public.page_views where user_id in (select user_id from public.admins)
  ),
  views as (
    select * from public.page_views
    where created_at >= since and visitor_id not in (select visitor_id from admin_visitors)
  ),
  calendar as (
    select generate_series(since, date_trunc('day', now()), interval '1 day')::date as day
  )
  select jsonb_build_object(
    'days', days,
    'users', jsonb_build_object(
      'total', (select count(*) from auth.users),
      'confirmed', (select count(*) from auth.users where email_confirmed_at is not null),
      'new_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
      'new_period', (select count(*) from auth.users where created_at >= since),
      'active_7d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days')
    ),
    'content', jsonb_build_object(
      'books', (select count(*) from public.books),
      'saved_words', (select count(*) from public.saved_words),
      'known_words', (select count(*) from public.known_words)
    ),
    'traffic', jsonb_build_object(
      'views', (select count(*) from views),
      'visitors', (select count(distinct visitor_id) from views),
      'visitors_7d', (select count(distinct visitor_id) from views where created_at >= now() - interval '7 days'),
      'mobile_share', (select round(100.0 * count(*) filter (where device = 'mobile') / greatest(count(*), 1)) from views)
    ),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'day', c.day,
        'views', (select count(*) from views v where v.created_at::date = c.day),
        'visitors', (select count(distinct visitor_id) from views v where v.created_at::date = c.day),
        'signups', (select count(*) from auth.users u where u.created_at::date = c.day)
      ) order by c.day)
      from calendar c
    ),
    'by_kind', (
      select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'views', n) order by n desc), '[]'::jsonb)
      from (select kind, count(*) as n from views group by kind) k
    ),
    'top_pages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'views', n, 'visitors', visitors) order by n desc), '[]'::jsonb)
      from (select path, count(*) as n, count(distinct visitor_id) as visitors from views group by path order by n desc limit 15) p
    ),
    'referrers', (
      select coalesce(jsonb_agg(jsonb_build_object('host', host, 'views', n) order by n desc), '[]'::jsonb)
      from (
        select substring(referrer from '^https?://([^/:?#]+)') as host, count(*) as n
        from views where referrer is not null and referrer <> ''
        group by 1 order by n desc limit 10
      ) r where host is not null
    ),
    'recent_users', (
      select coalesce(jsonb_agg(row_to_json(u) order by u.created_at desc), '[]'::jsonb)
      from (
        select
          au.email,
          au.created_at,
          au.last_sign_in_at,
          au.email_confirmed_at is not null as confirmed,
          (select count(*) from public.books b where b.owner_id = au.id) as books,
          (select count(*) from public.saved_words w where w.owner_id = au.id) as words,
          coalesce(au.raw_user_meta_data -> 'ling_profile' -> 'languages', '[]'::jsonb) as languages
        from auth.users au
        order by au.created_at desc
        limit 50
      ) u
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_stats(integer) from public, anon;
grant execute on function public.admin_stats(integer) to authenticated;
grant execute on function public.is_admin() to authenticated;
