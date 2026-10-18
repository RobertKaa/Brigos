-- Community data is a separate, explicitly published projection. Never grant
-- access to another player's game, Auth identity or inventory.
create table public.brigo_community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  id uuid not null unique default gen_random_uuid(),
  pseudo text not null default '' check (char_length(pseudo) <= 40),
  bio text not null default '' check (char_length(bio) <= 240),
  avatar text not null default 'coral' check (avatar in ('coral', 'mint', 'gold')),
  visible boolean not null default false,
  moderated boolean not null default false,
  featured_id uuid,
  revision bigint not null default 0 check (revision between 0 and 9007199254740991),
  updated_at timestamptz not null default now()
);
create table public.brigo_community_creations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.brigo_community_profiles(user_id) on delete cascade,
  project_id text not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 150000),
  moderated boolean not null default false,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  unique(user_id, project_id)
);
create table public.brigo_community_reports (
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('profile', 'creation')),
  target_id uuid not null,
  reason text not null check (reason in ('inappropriate', 'rights', 'spam')),
  created_at timestamptz not null default now(),
  primary key(reporter_id, target_kind, target_id)
);
create table public.brigo_community_windows (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  requests integer not null
);
alter table public.brigo_community_profiles enable row level security;
alter table public.brigo_community_creations enable row level security;
alter table public.brigo_community_reports enable row level security;
alter table public.brigo_community_windows enable row level security;
revoke all on public.brigo_community_profiles, public.brigo_community_creations,
  public.brigo_community_reports, public.brigo_community_windows from public, anon, authenticated;
grant all on public.brigo_community_profiles, public.brigo_community_creations,
  public.brigo_community_reports, public.brigo_community_windows to service_role;
create index brigo_community_profile_order on public.brigo_community_profiles(lower(pseudo), id) where visible and not moderated;
create index brigo_community_creation_order on public.brigo_community_creations(published_at desc, id);

-- Match the UTF-16 limits used by HTML maxLength and the game validators.
create function public.brigo_community_text_length(v text) returns integer
language sql immutable strict set search_path = '' as $$
  select coalesce(sum(case when ascii(c) > 65535 then 2 else 1 end),0)::integer from regexp_split_to_table(v,'') c;
$$;
revoke all on function public.brigo_community_text_length(text) from public, anon, authenticated;

create function public.brigo_community_profile_json(p public.brigo_community_profiles) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'pseudo', p.pseudo, 'bio', p.bio, 'avatar', p.avatar,
    'featuredCreationId', (select c.id from public.brigo_community_creations c where c.id = p.featured_id and c.user_id = p.user_id and c.published and not c.moderated),
    'publishedCount', (select count(*) from public.brigo_community_creations c where c.user_id = p.user_id and c.published and not c.moderated));
$$;
create function public.brigo_community_creation_json(c public.brigo_community_creations) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select c.snapshot || jsonb_build_object('id', c.id, 'publishedAt', c.published_at,
    'author', public.brigo_community_profile_json(p))
  from public.brigo_community_profiles p where p.user_id = c.user_id;
$$;
revoke all on function public.brigo_community_profile_json(public.brigo_community_profiles),
  public.brigo_community_creation_json(public.brigo_community_creations) from public, anon, authenticated;
grant execute on function public.brigo_community_profile_json(public.brigo_community_profiles),
  public.brigo_community_creation_json(public.brigo_community_creations) to service_role;

-- A single bounded RPC is the only player API. auth.uid() is supplied by the
-- verified database session, never by an argument, metadata or a public ID.
create function public.brigo_community(p_action text, p_input jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  profile public.brigo_community_profiles%rowtype;
  creation public.brigo_community_creations%rowtype;
  game jsonb;
  project jsonb;
  exhibit jsonb;
  payload jsonb;
  target uuid;
  amount integer;
  page_number integer := 1;
  page_size integer := 12;
  needle text := '';
  allowed text[];
  output jsonb;
  window_time timestamptz := date_trunc('minute', clock_timestamp());
begin
  if actor is null or not exists (select 1 from auth.users where id = actor and email_confirmed_at is not null and not coalesce(is_anonymous, false)) then
    return jsonb_build_object('error', 'AUTH_REQUIRED');
  end if;
  if jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text) > 2048 then
    return jsonb_build_object('error', 'INVALID_INPUT');
  end if;
  allowed := case p_action
    when 'players' then array['q','page']
    when 'creations' then array['q','page','playerId']
    when 'profile' then array['id','page']
    when 'creation' then array['id']
    when 'mine' then array[]::text[]
    when 'save-profile' then array['pseudo','bio','avatar','visible','featuredCreationId','expectedRevision']
    when 'publish' then array['projectId']
    when 'unpublish' then array['id']
    when 'report' then array['kind','id','reason']
    else null end;
  if allowed is null or exists(select 1 from jsonb_object_keys(p_input) k where not k = any(allowed)) then
    return jsonb_build_object('error', 'INVALID_INPUT');
  end if;
  insert into public.brigo_community_windows values (actor, window_time, 1)
  on conflict (user_id) do update set window_start = excluded.window_start,
    requests = case when public.brigo_community_windows.window_start = excluded.window_start
      then least(public.brigo_community_windows.requests + 1, 10000) else 1 end returning requests into amount;
  if amount > 120 then return jsonb_build_object('error', 'RATE_LIMITED'); end if;

  -- Serialize publication, profile visibility and removal for this account.
  -- Reads do not create a profile or copy any local or Auth metadata.
  if p_action in ('save-profile','publish','unpublish') then
    insert into public.brigo_community_profiles(user_id) values(actor) on conflict do nothing;
    select * into profile from public.brigo_community_profiles where user_id = actor for update;
  end if;
  if p_input ? 'page' then
    if jsonb_typeof(p_input->'page') <> 'number' or (p_input->>'page') !~ '^[1-9][0-9]{0,3}$' then
      return jsonb_build_object('error', 'INVALID_INPUT'); end if;
    page_number := (p_input->>'page')::integer;
    if page_number > 1000 then return jsonb_build_object('error','INVALID_INPUT'); end if;
  end if;
  if p_input ? 'q' then
    if jsonb_typeof(p_input->'q') <> 'string' or char_length(p_input->>'q') > 40 then
      return jsonb_build_object('error', 'INVALID_INPUT'); end if;
    needle := lower(btrim(p_input->>'q'));
  end if;
  if p_input ? 'id' or p_input ? 'playerId' then
    if coalesce(p_input->>'id', p_input->>'playerId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return jsonb_build_object('error','INVALID_INPUT'); end if;
    target := coalesce(p_input->>'id', p_input->>'playerId')::uuid;
  end if;

  if p_action = 'save-profile' then
    if jsonb_typeof(p_input->'expectedRevision') is distinct from 'number' or
      (p_input->>'expectedRevision') !~ '^(0|[1-9][0-9]{0,15})$' then return jsonb_build_object('error','INVALID_INPUT'); end if;
    if (p_input->>'expectedRevision')::numeric <> profile.revision then
      return jsonb_build_object('error','PROFILE_CONFLICT'); end if;
    if jsonb_typeof(p_input->'pseudo') is distinct from 'string' or public.brigo_community_text_length(btrim(p_input->>'pseudo')) not between 1 and 40
      or jsonb_typeof(p_input->'bio') is distinct from 'string' or public.brigo_community_text_length(p_input->>'bio') > 240
      or (p_input->>'pseudo') ~ '[[:cntrl:]\u007f-\u009f\u202a-\u202e\u2066-\u2069]' or (p_input->>'bio') ~ '[[:cntrl:]\u007f-\u009f\u202a-\u202e\u2066-\u2069]'
      or coalesce(p_input->>'avatar','') not in ('coral','mint','gold') or jsonb_typeof(p_input->'visible') is distinct from 'boolean'
      or not (p_input ? 'featuredCreationId') then return jsonb_build_object('error','INVALID_INPUT'); end if;
    target := null;
    if p_input->'featuredCreationId' <> 'null'::jsonb then
      if coalesce(p_input->>'featuredCreationId','') !~* '^[0-9a-f-]{36}$' then return jsonb_build_object('error','INVALID_INPUT'); end if;
      select id into target from public.brigo_community_creations where user_id = actor and id::text = p_input->>'featuredCreationId' and published and not moderated;
      if target is null then return jsonb_build_object('error','NOT_FOUND'); end if;
    end if;
    update public.brigo_community_profiles set pseudo = btrim(p_input->>'pseudo'), bio = btrim(p_input->>'bio'), avatar = p_input->>'avatar',
      visible = (p_input->>'visible')::boolean, featured_id = target, revision = revision + 1, updated_at = clock_timestamp() where user_id = actor;
  elsif p_action = 'publish' then
    if not profile.visible or profile.moderated then return jsonb_build_object('error','PROFILE_PRIVATE'); end if;
    if jsonb_typeof(p_input->'projectId') is distinct from 'string' or char_length(p_input->>'projectId') not between 1 and 80 then return jsonb_build_object('error','INVALID_INPUT'); end if;
    select state into game from public.brigo_games where user_id = actor for share;
    select value into project from jsonb_array_elements(coalesce(game->'sandboxProjects', '[]'::jsonb)) where value->>'id' = p_input->>'projectId';
    select value into exhibit from jsonb_array_elements(coalesce(game->'freeGallery'->'exhibits', '[]'::jsonb)) where value->>'projectId' = p_input->>'projectId';
    if project is null or exhibit is null or jsonb_array_length(project->'placements') not between 1 and 500 then return jsonb_build_object('error','NOT_FOUND'); end if;
    -- Every field is selected from the actor's persisted game. Client geometry,
    -- balances and unknown/private project properties are never accepted.
    payload := jsonb_build_object('title', project->>'name', 'description', exhibit->>'description', 'rotation', exhibit->'rotation', 'backgroundId', exhibit->>'backgroundId',
      'placements', (select jsonb_agg(jsonb_build_object('brigoId', v->>'brigoId','x',v->'x','y',v->'y','z',v->'z','rotation',v->'rotation') order by n)
        from jsonb_array_elements(project->'placements') with ordinality a(v,n)));
    insert into public.brigo_community_creations(user_id, project_id, snapshot) values(actor, project->>'id', payload)
    on conflict(user_id, project_id) do update set snapshot = excluded.snapshot, published = true
    returning * into creation;
    -- An author cannot undo a moderator's mask by updating or republishing.
    return jsonb_build_object('ok',true,'id',creation.id);
  elsif p_action = 'unpublish' then
    delete from public.brigo_community_creations where id = target and user_id = actor and not moderated;
    update public.brigo_community_creations set published = false where id = target and user_id = actor;
    update public.brigo_community_profiles set featured_id = null, revision = revision + 1, updated_at = clock_timestamp() where user_id = actor and featured_id = target;
    return jsonb_build_object('ok',true);
  elsif p_action = 'report' then
    if coalesce(p_input->>'kind','') not in ('profile','creation') or coalesce(p_input->>'reason','') not in ('inappropriate','rights','spam') then return jsonb_build_object('error','INVALID_INPUT'); end if;
    if not exists(select 1 from public.brigo_community_profiles p where p.visible and not p.moderated and
      ((p_input->>'kind' = 'profile' and p.id = target) or (p_input->>'kind' = 'creation' and exists(select 1 from public.brigo_community_creations c where c.id = target and c.user_id = p.user_id and c.published and not c.moderated)))) then
      return jsonb_build_object('error','NOT_FOUND'); end if;
    if (select count(*) from public.brigo_community_reports where reporter_id = actor and created_at > clock_timestamp() - interval '1 day') >= 5 then
      return jsonb_build_object('error','RATE_LIMITED'); end if;
    insert into public.brigo_community_reports values(actor,p_input->>'kind',target,p_input->>'reason',clock_timestamp()) on conflict do nothing;
    return jsonb_build_object('ok',true);
  end if;

  if p_action in ('mine','save-profile') then
    select * into profile from public.brigo_community_profiles where user_id = actor;
    return jsonb_build_object('profile', case when profile.id is null then null else public.brigo_community_profile_json(profile) || jsonb_build_object('visible', profile.visible, 'moderated', profile.moderated, 'revision', profile.revision) end,
      'creations', coalesce((select jsonb_agg(jsonb_build_object('id',id,'projectId',project_id,'title',snapshot->>'title','moderated',moderated) order by published_at desc) from public.brigo_community_creations where user_id = actor and published),'[]'::jsonb));
  elsif p_action = 'players' then
    select coalesce(jsonb_agg(public.brigo_community_profile_json(p) order by lower(p.pseudo), p.id),'[]'::jsonb) into output
    from (select * from public.brigo_community_profiles where visible and not moderated and position(needle in lower(pseudo)) > 0
      order by lower(pseudo), id limit page_size + 1 offset (page_number-1)*page_size) p;
  elsif p_action in ('creations','profile') then
    page_size := 6;
    if p_action = 'profile' then
      select * into profile from public.brigo_community_profiles where id = target and visible and not moderated;
      if not found then return jsonb_build_object('error','NOT_FOUND'); end if;
    end if;
    select coalesce(jsonb_agg(public.brigo_community_creation_json(c) order by c.published_at desc,c.id),'[]'::jsonb) into output
    from (select c.* from public.brigo_community_creations c join public.brigo_community_profiles p on p.user_id = c.user_id
      where p.visible and not p.moderated and c.published and not c.moderated and (target is null or p.id = target)
        and (position(needle in lower(c.snapshot->>'title')) > 0 or position(needle in lower(p.pseudo)) > 0)
      order by c.published_at desc, c.id limit page_size + 1 offset (page_number-1)*page_size) c;
  elsif p_action = 'creation' then
    select c.* into creation from public.brigo_community_creations c join public.brigo_community_profiles p on p.user_id = c.user_id
      where c.id = target and p.visible and not p.moderated and c.published and not c.moderated;
    if not found then return jsonb_build_object('error','NOT_FOUND'); end if;
    return jsonb_build_object('creation',public.brigo_community_creation_json(creation));
  end if;
  return jsonb_build_object('items', (select coalesce(jsonb_agg(v),'[]'::jsonb) from jsonb_array_elements(output) with ordinality a(v,n) where n <= page_size),
    'hasMore', jsonb_array_length(output) > page_size, 'profile', case when profile.id is null then null else public.brigo_community_profile_json(profile) end);
end;
$$;
revoke all on function public.brigo_community(text,jsonb) from public, anon;
grant execute on function public.brigo_community(text,jsonb) to authenticated;

-- Removing a private exhibit/project also removes its public snapshot in the
-- SAME game transaction. Editing geometry leaves the explicitly published copy.
create function public.brigo_community_prune() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.brigo_community_creations c set published = false where c.user_id = new.user_id and not exists (
    select 1 from jsonb_array_elements(coalesce(new.state->'freeGallery'->'exhibits','[]'::jsonb)) e
    join jsonb_array_elements(coalesce(new.state->'sandboxProjects','[]'::jsonb)) p on p->>'id' = e->>'projectId'
    where e->>'projectId' = c.project_id and jsonb_array_length(p->'placements') > 0);
  delete from public.brigo_community_creations where user_id = new.user_id and not published and not moderated;
  return new;
end;
$$;
revoke all on function public.brigo_community_prune() from public, anon, authenticated;
create trigger brigo_community_game_prune after update of state on public.brigo_games for each row execute function public.brigo_community_prune();

-- Moderators use this from a trusted server/SQL console. No player role has
-- permission; reporting alone never gives a player the power to hide others.
create function public.brigo_community_moderate(p_kind text,p_id uuid,p_hidden boolean) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_kind = 'profile' then update public.brigo_community_profiles set moderated = p_hidden where id = p_id;
  elsif p_kind = 'creation' then update public.brigo_community_creations set moderated = p_hidden where id = p_id;
  else raise exception 'Invalid moderation target'; end if;
end;
$$;
revoke all on function public.brigo_community_moderate(text,uuid,boolean) from public, anon, authenticated;
grant execute on function public.brigo_community_moderate(text,uuid,boolean) to service_role;
