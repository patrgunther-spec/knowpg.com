-- Pop In schema. Paste this whole file into Supabase SQL Editor and click RUN.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  friend_code text unique not null,
  avatar text default '',
  website text default '',
  home_location text default '',
  status text default '',
  lat double precision,
  lng double precision,
  updated_at timestamptz default now()
);

create table if not exists friends (
  user_id uuid references profiles(id) on delete cascade,
  friend_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  date text not null,
  time text default '',
  note text default '',
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table friends enable row level security;
alter table messages enable row level security;
alter table plans enable row level security;

drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_insert" on profiles;
drop policy if exists "profiles_update" on profiles;
create policy "profiles_select" on profiles for select to authenticated using (true);
create policy "profiles_insert" on profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on profiles for update to authenticated using (id = auth.uid());

drop policy if exists "friends_select" on friends;
drop policy if exists "friends_insert" on friends;
drop policy if exists "friends_delete" on friends;
create policy "friends_select" on friends for select to authenticated using (user_id = auth.uid() or friend_id = auth.uid());
create policy "friends_insert" on friends for insert to authenticated with check (user_id = auth.uid());
create policy "friends_delete" on friends for delete to authenticated using (user_id = auth.uid());

drop policy if exists "messages_select" on messages;
drop policy if exists "messages_insert" on messages;
create policy "messages_select" on messages for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "messages_insert" on messages for insert to authenticated with check (sender_id = auth.uid());

drop policy if exists "plans_select" on plans;
drop policy if exists "plans_insert" on plans;
drop policy if exists "plans_delete" on plans;
create policy "plans_select" on plans for select to authenticated using (true);
create policy "plans_insert" on plans for insert to authenticated with check (creator_id = auth.uid());
create policy "plans_delete" on plans for delete to authenticated using (creator_id = auth.uid());

alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table friends;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table plans;
