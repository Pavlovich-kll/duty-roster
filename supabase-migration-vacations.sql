-- Migration: add vacation support and profile fields
-- Run this in Supabase SQL Editor after the main schema

-- Add columns to profiles (ignores if already exist)
alter table profiles add column if not exists sort_order int default 0;
alter table profiles add column if not exists telegram text;
alter table profiles add column if not exists mattermost text;
alter table profiles add column if not exists phone text;

-- Create vacations table
create table if not exists vacations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  created_at timestamp with time zone default now(),
  constraint valid_range check (end_date >= start_date)
);

alter table vacations enable row level security;

-- RLS for vacations
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

-- Allow admins to update any profile
drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile"
  on profiles for update
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
