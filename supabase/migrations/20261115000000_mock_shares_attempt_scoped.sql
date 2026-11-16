-- Attempt-scoped practice sharing. Creation is authenticated and performed through
-- server-only functions; public clients can read only through token-checked server code.
create table if not exists public.mock_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  attempt_id text not null unique,
  token text not null unique check (token ~ '^[a-f0-9]{64}$'),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  revoked_at timestamptz,
  constraint mock_shares_attempt_owner_fk foreign key (owner_id, attempt_id) references public.mock_attempts(user_id, id) on delete cascade,
  constraint mock_shares_expiry_after_creation check (expires_at > created_at)
);

alter table public.mock_shares enable row level security;
revoke all on table public.mock_shares from public, anon, authenticated;
grant select on table public.mock_shares to authenticated;
grant all on table public.mock_shares to service_role;

create policy "Owners can inspect their mock shares"
  on public.mock_shares for select to authenticated
  using (auth.uid() = owner_id);

create or replace function public.prevent_mock_share_identity_changes()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.attempt_id is distinct from old.attempt_id
     or new.token is distinct from old.token
     or new.visibility is distinct from old.visibility
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Mock share identity and visibility are immutable';
  end if;
  if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
    raise exception 'A revoked mock share cannot be restored';
  end if;
  return new;
end;
$$;

create or replace function public.set_mock_share_expiry()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.created_at := now();
  new.expires_at := new.created_at + interval '30 minutes';
  return new;
end;
$$;

create trigger mock_shares_server_expiry
  before insert on public.mock_shares
  for each row execute function public.set_mock_share_expiry();

create trigger mock_shares_identity_immutable
  before update on public.mock_shares
  for each row execute function public.prevent_mock_share_identity_changes();
