-- Conversation share links are read and written only by chat-sharing.server.ts.
-- Public access is mediated by a server function that checks visibility and revocation.
create table if not exists public.chat_shares (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique check (token ~ '^[a-f0-9]{64}$'),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  snapshot jsonb not null,
  is_revoked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id, owner_id)
);

alter table public.chat_shares enable row level security;
revoke all on table public.chat_shares from public, anon, authenticated;
grant all on table public.chat_shares to service_role;
