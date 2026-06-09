-- Optional Supabase starter schema for online rooms
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'lobby',
  mode text not null default 'online',
  rules jsonb not null default '{}'::jsonb,
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  name text not null,
  is_bot boolean not null default false,
  difficulty text,
  seat integer not null,
  ready boolean not null default false,
  created_at timestamptz not null default now()
);

alter table rooms enable row level security;
alter table players enable row level security;

create policy "rooms are public for prototype" on rooms for all using (true) with check (true);
create policy "players are public for prototype" on players for all using (true) with check (true);
