create table if not exists public.legal_templates (
  id text primary key,
  name text not null,
  doc_type text not null default '自定义模板',
  source_label text not null default '自建模板',
  applicable_skills jsonb not null default '[]'::jsonb,
  agent text not null default '模板助手',
  required_fields jsonb not null default '[]'::jsonb,
  preview text not null,
  route_name text not null default 'templates',
  tags jsonb not null default '[]'::jsonb,
  template_updated_at text,
  document_sections jsonb not null default '[]'::jsonb,
  original_file jsonb,
  extraction_state text not null default 'idle' check (extraction_state in ('idle', 'reading', 'analyzing', 'done', 'error')),
  extraction_message text,
  publish_destinations jsonb not null default '[]'::jsonb,
  publish_settings jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_templates_updated_at_idx
  on public.legal_templates (updated_at desc);
