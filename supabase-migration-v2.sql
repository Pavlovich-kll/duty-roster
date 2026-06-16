-- Run this SQL in Supabase SQL Editor after backing up any existing data

-- 1. Create developers table
create table if not exists developers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  sort_order int default 0,
  telegram text,
  mattermost text,
  phone text,
  team text not null default 'java',
  created_at timestamp with time zone default now()
);

alter table developers enable row level security;

-- 2. Drop old tables and recreate with developer_id
drop table if exists vacations cascade;
drop table if exists duty_shifts cascade;

create table duty_shifts (
  id uuid default gen_random_uuid() primary key,
  developer_id uuid references developers(id) on delete cascade not null,
  date date not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table duty_shifts enable row level security;

create table vacations (
  id uuid default gen_random_uuid() primary key,
  developer_id uuid references developers(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  created_at timestamp with time zone default now(),
  constraint valid_range check (end_date >= start_date)
);

alter table vacations enable row level security;

-- 3. RLS policies

create policy "Anyone can view developers"
  on developers for select
  to authenticated
  using (true);

create policy "Admins can manage developers"
  on developers for insert
  to authenticated
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Admins can update developers"
  on developers for update
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Admins can delete developers"
  on developers for delete
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Anyone can view shifts"
  on duty_shifts for select
  to authenticated
  using (true);

create policy "Admins can insert shifts"
  on duty_shifts for insert
  to authenticated
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Admins can update shifts"
  on duty_shifts for update
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Admins can delete shifts"
  on duty_shifts for delete
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Anyone can view vacations"
  on vacations for select
  to authenticated
  using (true);

create policy "Admins can insert vacations"
  on vacations for insert
  to authenticated
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Admins can update vacations"
  on vacations for update
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Admins can delete vacations"
  on vacations for delete
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
