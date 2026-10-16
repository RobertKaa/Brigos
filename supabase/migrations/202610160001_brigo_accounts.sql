-- Public API is read-only for players. All economic writes use authenticated
-- Edge Functions and service_role-only RPCs, never client-supplied state.
create table public.brigo_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or (char_length(display_name) between 1 and 40 and display_name !~ '[[:cntrl:]]')),
  created_at timestamptz not null default now()
);
create table public.brigo_games (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 3000000),
  revision bigint not null default 0 check (revision >= 0 and revision <= 9007199254740991),
  updated_at timestamptz not null default now()
);
create table public.brigo_command_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  command_id uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  committed_revision bigint not null check (committed_revision >= 0),
  result jsonb not null check (jsonb_typeof(result) = 'object' and octet_length(result::text) <= 16384),
  created_at timestamptz not null default now(),
  primary key (user_id, command_id)
);
create table public.brigo_economic_ledger (
  user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null check (revision >= 0),
  command_id uuid not null,
  command jsonb not null check (jsonb_typeof(command) = 'object'),
  delta jsonb not null check (jsonb_typeof(delta) = 'object'),
  coins_before bigint not null,
  coins_after bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, revision),
  foreign key (user_id, command_id) references public.brigo_command_receipts(user_id, command_id) on delete cascade
);
create table public.brigo_request_windows (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  requests integer not null check (requests > 0)
);

alter table public.brigo_profiles enable row level security;
alter table public.brigo_games enable row level security;
alter table public.brigo_command_receipts enable row level security;
alter table public.brigo_economic_ledger enable row level security;
alter table public.brigo_request_windows enable row level security;
create policy brigo_profile_owner_read on public.brigo_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy brigo_game_owner_read on public.brigo_games for select to authenticated using ((select auth.uid()) = user_id);
create policy brigo_receipt_owner_read on public.brigo_command_receipts for select to authenticated using ((select auth.uid()) = user_id);
create policy brigo_ledger_owner_read on public.brigo_economic_ledger for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.brigo_profiles, public.brigo_games, public.brigo_command_receipts, public.brigo_economic_ledger, public.brigo_request_windows from public, anon, authenticated;
grant select on public.brigo_profiles, public.brigo_games, public.brigo_command_receipts, public.brigo_economic_ledger to authenticated;
grant all on public.brigo_profiles, public.brigo_games, public.brigo_command_receipts, public.brigo_economic_ledger, public.brigo_request_windows to service_role;

-- A pseudo is display-only. Auth metadata never controls balances or privileges.
create function public.brigo_sync_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.brigo_profiles(user_id, display_name)
  values (new.id, nullif(left(btrim(regexp_replace(coalesce(new.raw_user_meta_data->>'display_name', ''), '[[:cntrl:]]', '', 'g')), 40), ''))
  on conflict (user_id) do update set display_name = excluded.display_name;
  return new;
end;
$$;
revoke all on function public.brigo_sync_profile() from public, anon, authenticated;
create trigger brigo_auth_profile after insert or update of raw_user_meta_data on auth.users
for each row execute function public.brigo_sync_profile();
insert into public.brigo_profiles(user_id, display_name)
select id, nullif(left(btrim(regexp_replace(coalesce(raw_user_meta_data->>'display_name', ''), '[[:cntrl:]]', '', 'g')), 40), '') from auth.users
on conflict (user_id) do nothing;

create function public.brigo_load_game(
  p_user_id uuid, p_initial_state jsonb,
  p_command_id uuid default null, p_request_hash text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  game public.brigo_games%rowtype;
  receipt public.brigo_command_receipts%rowtype;
  request_count integer;
  current_window timestamptz := date_trunc('minute', clock_timestamp());
  response_status text := 'loaded';
  initial_command_id uuid;
begin
  insert into public.brigo_request_windows(user_id, window_start, requests)
  values (p_user_id, current_window, 1)
  on conflict (user_id) do update set
    window_start = excluded.window_start,
    requests = case when public.brigo_request_windows.window_start = excluded.window_start
      then least(public.brigo_request_windows.requests + 1, 10000) else 1 end
  returning requests into request_count;
  if request_count > 120 then return jsonb_build_object('status', 'rate_limited'); end if;

  insert into public.brigo_games(user_id, state) values (p_user_id, p_initial_state)
  on conflict (user_id) do nothing returning * into game;
  if found then
    -- The welcome resources have the same transaction/audit guarantees as
    -- subsequent rewards; a racing first load cannot generate a second grant.
    initial_command_id := gen_random_uuid();
    insert into public.brigo_command_receipts(user_id, command_id, request_hash, committed_revision, result)
    values (p_user_id, initial_command_id, repeat('0', 64), 0, '{}'::jsonb);
    insert into public.brigo_economic_ledger(user_id, revision, command_id, command, delta, coins_before, coins_after)
    values (p_user_id, 0, initial_command_id, '{"type":"server-init"}'::jsonb,
      jsonb_build_object('coins', (game.state->>'coins')::bigint, 'boxes', game.state->'boxes', 'inventory', game.state->'inventory'),
      0, (game.state->>'coins')::bigint);
  end if;
  -- Read game and receipt under the same lock so a replay never returns an
  -- older revision than the command whose receipt was just committed.
  select * into strict game from public.brigo_games where user_id = p_user_id for share;
  if p_command_id is not null then
    select * into receipt from public.brigo_command_receipts where user_id = p_user_id and command_id = p_command_id;
    if found then
      response_status := case when receipt.request_hash = p_request_hash then 'replayed' else 'command_id_reused' end;
    end if;
  end if;
  return jsonb_build_object('status', response_status, 'state', game.state, 'revision', game.revision,
    'serverTime', to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'result', coalesce(receipt.result, '{}'::jsonb));
end;
$$;

create function public.brigo_commit_command(
  p_user_id uuid, p_command_id uuid, p_request_hash text, p_expected_revision bigint,
  p_state jsonb, p_result jsonb, p_command jsonb, p_delta jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  game public.brigo_games%rowtype;
  receipt public.brigo_command_receipts%rowtype;
  response_status text;
  result_value jsonb := '{}'::jsonb;
begin
  -- Serialize commits for this account. The receipt is checked AFTER obtaining
  -- the row lock, including when two identical requests arrive together.
  select * into strict game from public.brigo_games where user_id = p_user_id for update;
  select * into receipt from public.brigo_command_receipts where user_id = p_user_id and command_id = p_command_id;
  if found then
    response_status := case when receipt.request_hash = p_request_hash then 'replayed' else 'command_id_reused' end;
    result_value := receipt.result;
  elsif game.revision <> p_expected_revision then
    response_status := 'revision_conflict';
  else
    if p_request_hash !~ '^[0-9a-f]{64}$' or p_command_id is null or
       jsonb_typeof(p_command) <> 'object' or jsonb_typeof(p_delta) <> 'object' then
      raise exception using errcode = '22023', message = 'Invalid command envelope';
    end if;
    -- Any constraint or insertion failure aborts ALL state, receipt and ledger writes.
    insert into public.brigo_command_receipts(user_id, command_id, request_hash, committed_revision, result)
    values (p_user_id, p_command_id, p_request_hash, game.revision + 1, p_result);
    insert into public.brigo_economic_ledger(user_id, revision, command_id, command, delta, coins_before, coins_after)
    values (p_user_id, game.revision + 1, p_command_id, p_command, p_delta,
      (game.state->>'coins')::bigint, (p_state->>'coins')::bigint);
    update public.brigo_games set state = p_state, revision = game.revision + 1, updated_at = clock_timestamp()
    where user_id = p_user_id returning * into game;
    response_status := 'committed';
    result_value := p_result;
  end if;
  return jsonb_build_object('status', response_status, 'state', game.state, 'revision', game.revision,
    'serverTime', to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'result', result_value);
end;
$$;
revoke all on function public.brigo_load_game(uuid, jsonb, uuid, text) from public, anon, authenticated;
revoke all on function public.brigo_commit_command(uuid, uuid, text, bigint, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.brigo_load_game(uuid, jsonb, uuid, text) to service_role;
grant execute on function public.brigo_commit_command(uuid, uuid, text, bigint, jsonb, jsonb, jsonb, jsonb) to service_role;
