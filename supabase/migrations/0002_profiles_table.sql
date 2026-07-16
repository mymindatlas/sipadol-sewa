-- Pre-migration scaffolding from early auth wiring: a hand-built
-- profiles (id, role text, created_at), its own trigger, and two ad
-- hoc policies, none of it tracked by a migration. Confirmed with the
-- project owner and cleared to replace outright with the schema below.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.profiles cascade;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role public.user_role not null default 'resident',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS on, no policies yet. current_role() (0003) must exist before any
-- policy references it, or a policy on profiles that queries profiles
-- recurses infinitely -- see AGENTS.md on why 0002/0003/0004 are split.
alter table public.profiles enable row level security;

-- SECURITY DEFINER: runs as the table owner, so it can insert here even
-- though RLS is on and (until 0004) no policy exists at all. role is
-- hardcoded to 'resident' -- raw_user_meta_data is attacker-controlled
-- at signup, so no value read from it may ever reach the role column.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    'resident'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
