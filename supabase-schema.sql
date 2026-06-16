-- Run this in Supabase SQL Editor
-- Drop existing trigger/functions first to allow clean re-run
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user;

-- Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  is_admin boolean default false,
  sort_order int default 0,
  telegram text,
  mattermost text,
  phone text,
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

-- Duty shifts: one person per day
create table if not exists duty_shifts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table duty_shifts enable row level security;

-- Vacations
create table if not exists vacations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  created_at timestamp with time zone default now(),
  constraint valid_range check (end_date >= start_date)
);

alter table vacations enable row level security;

-- RLS policies
create policy "Users can view all profiles"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Admins can update any profile"
  on profiles for update
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Anyone can view shifts"
  on duty_shifts for select
  to authenticated
  using (true);

create policy "Admins can insert shifts"
  on duty_shifts for insert
  to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update shifts"
  on duty_shifts for update
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete shifts"
  on duty_shifts for delete
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Anyone can view vacations"
  on vacations for select
  to authenticated
  using (true);

create policy "Admins can insert vacations"
  on vacations for insert
  to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update vacations"
  on vacations for update
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete vacations"
  on vacations for delete
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, is_admin, sort_order)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), false, 0);
  return new;
end;
$$;

-- Trigger to auto-create profile
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
