-- roles
create type public.app_role as enum ('admin', 'viewer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view all roles" on public.user_roles
for select to authenticated using (true);

-- profiles
create table public.profiles (
  id uuid primary key,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Profiles readable by authenticated" on public.profiles
for select to authenticated using (true);
create policy "Users can update own profile" on public.profiles
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- timestamp trigger fn
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at before update on public.profiles
for each row execute function public.update_updated_at_column();

-- expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  store_name text not null,
  category text not null default 'أخرى',
  spent_on date not null default current_date,
  note text,
  image_url text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;

create policy "Authenticated can view expenses" on public.expenses
for select to authenticated using (true);
create policy "Admins can insert expenses" on public.expenses
for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update expenses" on public.expenses
for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete expenses" on public.expenses
for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger update_expenses_updated_at before update on public.expenses
for each row execute function public.update_updated_at_column();

create index expenses_spent_on_idx on public.expenses (spent_on desc);

-- budget settings (single row)
create table public.budget_settings (
  id uuid primary key default gen_random_uuid(),
  monthly_cap numeric(12,2) not null default 4000,
  weekly_cap numeric(12,2) not null default 1000,
  currency text not null default 'EGP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.budget_settings to authenticated;
grant all on public.budget_settings to service_role;
alter table public.budget_settings enable row level security;

create policy "Authenticated can view budget" on public.budget_settings
for select to authenticated using (true);
create policy "Admins can insert budget" on public.budget_settings
for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update budget" on public.budget_settings
for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create trigger update_budget_settings_updated_at before update on public.budget_settings
for each row execute function public.update_updated_at_column();

insert into public.budget_settings (monthly_cap, weekly_cap) values (4000, 1000);

-- new user handler: profile + role (first user = admin)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (
    new.id,
    case when (select count(*) from public.user_roles where role = 'admin') = 0
      then 'admin'::public.app_role else 'viewer'::public.app_role end
  )
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- sample data
insert into public.expenses (amount, store_name, category, spent_on)
values (350, 'Hadhramout', 'غداء', current_date);