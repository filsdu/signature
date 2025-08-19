-- Run this in Supabase SQL Editor
create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  url text not null,
  x int not null,
  y int not null,
  w int not null,
  h int not null,
  rot_deg int not null default 0,
  name text,
  created_at timestamptz default now()
);

alter publication supabase_realtime add table public.signatures;

alter table public.signatures enable row level security;

drop policy if exists demo_select_all on public.signatures;
drop policy if exists demo_insert_all on public.signatures;
drop policy if exists demo_delete_all on public.signatures;

create policy demo_select_all on public.signatures
  for select using (true);

create policy demo_insert_all on public.signatures
  for insert with check (true);

create policy demo_delete_all on public.signatures
  for delete using (true);
