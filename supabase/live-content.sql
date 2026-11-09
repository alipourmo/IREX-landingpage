-- Run in the Supabase SQL editor, then add authorized user IDs below.
create table if not exists public.irex_content_editors (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.irex_live_content (
  id text primary key check (id = 'main'),
  document jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.irex_content_editors enable row level security;
alter table public.irex_live_content enable row level security;

revoke all on public.irex_content_editors from anon, authenticated;
revoke all on public.irex_live_content from anon, authenticated;
grant select on public.irex_content_editors to authenticated;
grant select on public.irex_live_content to anon, authenticated;
grant insert, update on public.irex_live_content to authenticated;

drop policy if exists "Editors can check their own membership" on public.irex_content_editors;
create policy "Editors can check their own membership" on public.irex_content_editors
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Anyone can read the live landing page" on public.irex_live_content;
create policy "Anyone can read the live landing page" on public.irex_live_content
  for select to anon, authenticated using (id = 'main');

drop policy if exists "Editors can create live content" on public.irex_live_content;
create policy "Editors can create live content" on public.irex_live_content
  for insert to authenticated with check (
    id = 'main' and exists (select 1 from public.irex_content_editors where user_id = (select auth.uid()))
  );

drop policy if exists "Editors can update live content" on public.irex_live_content;
create policy "Editors can update live content" on public.irex_live_content
  for update to authenticated using (
    id = 'main' and exists (select 1 from public.irex_content_editors where user_id = (select auth.uid()))
  ) with check (
    id = 'main' and exists (select 1 from public.irex_content_editors where user_id = (select auth.uid()))
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'irex_live_content'
  ) then
    alter publication supabase_realtime add table public.irex_live_content;
  end if;
end $$;

-- After creating a user in Supabase Auth, authorize them with:
-- insert into public.irex_content_editors (user_id) values ('USER_UUID_HERE');