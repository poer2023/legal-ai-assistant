create table if not exists public.legal_skills (
  id text primary key,
  slug text not null,
  name text not null,
  description text not null,
  category text not null default '自建技能',
  route_name text not null default 'chat',
  tags jsonb not null default '[]'::jsonb,
  scope text not null default 'personal' check (scope in ('personal', 'team')),
  source text not null default 'custom' check (source = 'custom'),
  status text not null default 'active' check (status in ('draft', 'active')),
  files jsonb not null,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_skills_updated_at_idx
  on public.legal_skills (updated_at desc);

create index if not exists legal_skills_scope_idx
  on public.legal_skills (scope);

alter table public.legal_skills
  add column if not exists icon_data_url text,
  add column if not exists publisher_name text,
  add column if not exists publisher_avatar_url text,
  add column if not exists use_profile_identity boolean not null default true,
  add column if not exists publish_destinations jsonb not null default '["team"]'::jsonb,
  add column if not exists publish_settings jsonb;
