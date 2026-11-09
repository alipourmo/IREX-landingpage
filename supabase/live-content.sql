-- Run in the Supabase SQL editor, then add authorized user IDs below.
create extension if not exists pgcrypto;

create table if not exists public.irex_content_editors (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.irex_live_content (
  id text primary key check (id = 'main'),
  document jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.irex_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  company text not null check (char_length(company) between 1 and 160),
  email text not null check (char_length(email) between 3 and 180),
  message text not null default '' check (char_length(message) <= 3000),
  status text not null default 'new' check (status in ('new', 'reviewed', 'contacted', 'archived')),
  notes text not null default '' check (char_length(notes) <= 5000),
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'logged', 'failed', 'not_configured')),
  email_id text,
  email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists irex_applications_created_at_idx
  on public.irex_applications (created_at desc);

create index if not exists irex_applications_status_idx
  on public.irex_applications (status);

alter table public.irex_content_editors enable row level security;
alter table public.irex_live_content enable row level security;
alter table public.irex_applications enable row level security;

revoke all on public.irex_content_editors from anon, authenticated;
revoke all on public.irex_live_content from anon, authenticated;
revoke all on public.irex_applications from anon, authenticated;

grant select on public.irex_content_editors to authenticated;
grant select on public.irex_live_content to anon, authenticated;
grant insert, update on public.irex_live_content to authenticated;
grant insert on public.irex_applications to anon, authenticated;
grant select, update, delete on public.irex_applications to authenticated;
grant all on table public.irex_content_editors to service_role;
grant all on table public.irex_live_content to service_role;
grant all on table public.irex_applications to service_role;

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

drop policy if exists "Public can submit applications" on public.irex_applications;
create policy "Public can submit applications" on public.irex_applications
  for insert to anon, authenticated with check (
    status = 'new' and notes = ''
  );

drop policy if exists "Editors can view applications" on public.irex_applications;
create policy "Editors can view applications" on public.irex_applications
  for select to authenticated using (
    exists (select 1 from public.irex_content_editors where user_id = (select auth.uid()))
  );

drop policy if exists "Editors can update applications" on public.irex_applications;
create policy "Editors can update applications" on public.irex_applications
  for update to authenticated using (
    exists (select 1 from public.irex_content_editors where user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.irex_content_editors where user_id = (select auth.uid()))
  );

drop policy if exists "Editors can delete applications" on public.irex_applications;
create policy "Editors can delete applications" on public.irex_applications
  for delete to authenticated using (
    exists (select 1 from public.irex_content_editors where user_id = (select auth.uid()))
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'irex_live_content'
  ) then
    alter publication supabase_realtime add table public.irex_live_content;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'irex_applications'
  ) then
    alter publication supabase_realtime add table public.irex_applications;
  end if;
end $$;

-- After creating the editor user in Supabase Auth (e.g. alipourmohammadi90@gmail.com),
-- authorize them with:
insert into public.irex_content_editors (user_id)
select id from auth.users where lower(email) = 'alipourmohammadi90@gmail.com'
on conflict (user_id) do nothing;
