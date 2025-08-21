-- ===========================================
-- Bootstrap (run in Supabase SQL editor)
-- ===========================================
-- UUID generator for ids (already enabled on Supabase projects, but keep for safety)
create extension if not exists pgcrypto;

-- ===========================================
-- CAMPAIGNS (shared across features)
-- You can mark exactly ONE as active per "kind" if you want.
-- kind: 'word' | 'confession' | 'photo'  (free-form text with a CHECK)
-- ===========================================
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('word','confession','photo')),
  active boolean not null default false,
  created_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_campaigns_kind on public.campaigns(kind);
create index if not exists idx_campaigns_active on public.campaigns(active);

-- Realtime
alter publication supabase_realtime add table public.campaigns;

-- RLS (demo-open like your current file)
alter table public.campaigns enable row level security;

drop policy if exists demo_campaigns_select_all on public.campaigns;
drop policy if exists demo_campaigns_insert_all on public.campaigns;
drop policy if exists demo_campaigns_update_all on public.campaigns;
drop policy if exists demo_campaigns_delete_all on public.campaigns;

create policy demo_campaigns_select_all on public.campaigns
  for select using (true);
create policy demo_campaigns_insert_all on public.campaigns
  for insert with check (true);
create policy demo_campaigns_update_all on public.campaigns
  for update using (true) with check (true);
create policy demo_campaigns_delete_all on public.campaigns
  for delete using (true);

-- ===========================================
-- WORD CAMPAIGN SIGNATURES
-- Matches your "word campaign" board (image signatures placed into text mask)
-- ===========================================
create table if not exists public.word_signatures (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  owner text not null,
  url text not null,          -- signature image URL
  x int not null,
  y int not null,
  w int not null,
  h int not null,
  rot_deg int not null default 0,
  name text,
  created_at timestamptz default now()
);

create index if not exists idx_word_signatures_campaign_id on public.word_signatures(campaign_id);
create index if not exists idx_word_signatures_created_at on public.word_signatures(created_at);

alter publication supabase_realtime add table public.word_signatures;

alter table public.word_signatures enable row level security;

drop policy if exists demo_ws_select_all on public.word_signatures;
drop policy if exists demo_ws_insert_all on public.word_signatures;
drop policy if exists demo_ws_delete_all on public.word_signatures;
drop policy if exists demo_ws_update_all on public.word_signatures;

create policy demo_ws_select_all on public.word_signatures
  for select using (true);
create policy demo_ws_insert_all on public.word_signatures
  for insert with check (true);
create policy demo_ws_update_all on public.word_signatures
  for update using (true) with check (true);
create policy demo_ws_delete_all on public.word_signatures
  for delete using (true);

-- ===========================================
-- CONFESSIONS
-- Text tiles with shape/size/rotation/color and optional name; tied to a campaign
-- ===========================================
create table if not exists public.confessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  owner text not null,
  text text not null,
  shape text not null default 'rounded',      -- 'rounded' | 'square' | 'circle' (free text)
  color text not null default '#000000',      -- hex color chosen by user
  x int not null,
  y int not null,
  w int not null,
  h int not null,
  rot_deg int not null default 0,
  name text,
  created_at timestamptz default now()
);

create index if not exists idx_confessions_campaign_id on public.confessions(campaign_id);
create index if not exists idx_confessions_created_at on public.confessions(created_at);

alter publication supabase_realtime add table public.confessions;

alter table public.confessions enable row level security;

drop policy if exists demo_conf_select_all on public.confessions;
drop policy if exists demo_conf_insert_all on public.confessions;
drop policy if exists demo_conf_update_all on public.confessions;
drop policy if exists demo_conf_delete_all on public.confessions;

create policy demo_conf_select_all on public.confessions
  for select using (true);
create policy demo_conf_insert_all on public.confessions
  for insert with check (true);
create policy demo_conf_update_all on public.confessions
  for update using (true) with check (true);
create policy demo_conf_delete_all on public.confessions
  for delete using (true);

-- ===========================================
-- PHOTOS
-- If you have a “photo wall”: images users drop on the board with transforms.
-- (If you don’t need it yet, you can still create it; it won’t hurt anything.)
-- ===========================================
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  owner text not null,
  url text not null,          -- uploaded image URL
  caption text,
  x int not null,
  y int not null,
  w int not null,
  h int not null,
  rot_deg int not null default 0,
  name text,                  -- display name (optional)
  created_at timestamptz default now()
);

create index if not exists idx_photos_campaign_id on public.photos(campaign_id);
create index if not exists idx_photos_created_at on public.photos(created_at);

alter publication supabase_realtime add table public.photos;

alter table public.photos enable row level security;

drop policy if exists demo_photos_select_all on public.photos;
drop policy if exists demo_photos_insert_all on public.photos;
drop policy if exists demo_photos_update_all on public.photos;
drop policy if exists demo_photos_delete_all on public.photos;

create policy demo_photos_select_all on public.photos
  for select using (true);
create policy demo_photos_insert_all on public.photos
  for insert with check (true);
create policy demo_photos_update_all on public.photos
  for update using (true) with check (true);
create policy demo_photos_delete_all on public.photos
  for delete using (true);

-- ===========================================
-- (Optional) LEGACY signatures table from your snippet
-- If another page still reads from public.signatures, keep it.
-- Otherwise you can skip this block.
-- ===========================================
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

create index if not exists idx_signatures_created_at on public.signatures(created_at);

alter publication supabase_realtime add table public.signatures;

alter table public.signatures enable row level security;

drop policy if exists demo_select_all on public.signatures;
drop policy if exists demo_insert_all on public.signatures;
drop policy if exists demo_delete_all on public.signatures;
drop policy if exists demo_update_all on public.signatures;

create policy demo_select_all on public.signatures
  for select using (true);
create policy demo_insert_all on public.signatures
  for insert with check (true);
create policy demo_update_all on public.signatures
  for update using (true) with check (true);
create policy demo_delete_all on public.signatures
  for delete using (true);
