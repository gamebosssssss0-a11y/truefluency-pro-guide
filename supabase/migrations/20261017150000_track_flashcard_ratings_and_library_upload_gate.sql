-- Track new flashcard ratings and add the existing upload-lock refusal to gate telemetry.
-- Historical ratings and refusals cannot be reconstructed; records begin after this migration.

alter table public.gate_hits
  drop constraint if exists gate_hits_gate_check;

alter table public.gate_hits
  add constraint gate_hits_gate_check
  check (gate = any (array[
    'mock_questions',
    'mock_sets',
    'flashcard_decks',
    'chat_messages',
    'upgrade_cta',
    'library_uploads'
  ]::text[]));

create table public.flashcard_rating_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id uuid references public.flashcards(id) on delete set null,
  course_code text not null,
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  created_at timestamptz not null default now()
);

create index flashcard_rating_events_user_course_created_idx
  on public.flashcard_rating_events (user_id, course_code, created_at desc);

create index flashcard_rating_events_card_created_idx
  on public.flashcard_rating_events (flashcard_id, created_at desc)
  where flashcard_id is not null;

alter table public.flashcard_rating_events enable row level security;

revoke all on public.flashcard_rating_events from anon, authenticated;
grant select on public.flashcard_rating_events to authenticated;

create policy "Users can read their own flashcard rating events"
  on public.flashcard_rating_events
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create function public.record_flashcard_rating(
  p_flashcard_id uuid,
  p_rating text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $
declare
  v_course_code text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_rating not in ('again', 'hard', 'good', 'easy') then
    raise exception 'Invalid flashcard rating';
  end if;

  select deck.course_code
    into v_course_code
  from public.flashcards as card
  join public.flashcard_decks as deck on deck.id = card.deck_id
  where card.id = p_flashcard_id
    and card.user_id = auth.uid()
    and deck.user_id = auth.uid();

  if v_course_code is null then
    raise exception 'Flashcard not found';
  end if;

  insert into public.flashcard_rating_events (user_id, flashcard_id, course_code, rating)
  values (auth.uid(), p_flashcard_id, v_course_code, p_rating);

  return true;
end;
$$;

create function public.flashcard_rating_counts(p_course_code text)
returns table (rating text, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with wanted(rating, sort_order) as (
    values ('again'::text, 1), ('hard'::text, 2), ('good'::text, 3), ('easy'::text, 4)
  )
  select wanted.rating, count(event.id)::bigint
  from wanted
  left join public.flashcard_rating_events as event
    on event.rating = wanted.rating
    and event.user_id = auth.uid()
    and upper(regexp_replace(btrim(event.course_code), '^C-', '')) =
        upper(regexp_replace(btrim(p_course_code), '^C-', ''))
  group by wanted.rating, wanted.sort_order
  order by wanted.sort_order;
$$;

revoke all on function public.record_flashcard_rating(uuid, text) from public, anon;
grant execute on function public.record_flashcard_rating(uuid, text) to authenticated;

revoke all on function public.flashcard_rating_counts(text) from public, anon;
grant execute on function public.flashcard_rating_counts(text) to authenticated;
