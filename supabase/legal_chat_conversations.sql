create table if not exists public.legal_chat_conversations (
  id text primary key,
  title text not null default '新会话',
  prompt text not null,
  pinned boolean not null default false,
  answer_content text,
  answer_model text,
  answer_cached_at timestamptz,
  answer_created_skill_id text,
  answer_thinking_content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_chat_conversations
  add column if not exists pinned boolean not null default false,
  add column if not exists answer_created_skill_id text,
  add column if not exists answer_thinking_content text;

create index if not exists legal_chat_conversations_updated_at_idx
  on public.legal_chat_conversations (updated_at desc);

create index if not exists legal_chat_conversations_pinned_idx
  on public.legal_chat_conversations (pinned);
