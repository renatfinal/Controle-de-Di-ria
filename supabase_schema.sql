-- Executar este SQL no Editor de SQL do seu painel do Supabase.

-- 1. Cria a tabela de usuários (profiles)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  name text,
  last_name text,
  email text unique not null,
  phone text,
  photo_url text,
  is_blocked boolean default false,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativa Row Level Security (RLS) para profiles
alter table public.profiles enable row level security;

-- Remove políticas antigas (se existirem) para evitar erro de duplicidade
drop policy if exists "Usuários podem ver seus próprios perfis." on profiles;
drop policy if exists "Usuários podem atualizar seus próprios perfis." on profiles;
drop policy if exists "Admins podem alterar todos." on profiles;

create policy "Usuários podem ver seus próprios perfis."
  on profiles for select
  using ( auth.uid() = id or (select role from profiles where id = auth.uid()) = 'admin' );

create policy "Usuários podem atualizar seus próprios perfis."
  on profiles for update
  using ( auth.uid() = id or (select role from profiles where id = auth.uid()) = 'admin' );

create policy "Admins podem alterar todos." on profiles
  for delete using ( (select role from profiles where id = auth.uid()) = 'admin' );

-- 2. Tabela para Registros Diários (daily_entries)
create table if not exists public.daily_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  date_key text not null, -- Exemplo: '2026-05-09'
  label text not null,
  value text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativa RLS para daily_entries
alter table public.daily_entries enable row level security;

drop policy if exists "Usuários podem inserir seus registros." on daily_entries;
drop policy if exists "Usuários podem ver seus próprios registros." on daily_entries;
drop policy if exists "Usuários podem atualizar seus registros." on daily_entries;
drop policy if exists "Usuários podem deletar seus registros." on daily_entries;

create policy "Usuários podem inserir seus registros."
  on daily_entries for insert
  with check ( auth.uid() = user_id or (select role from profiles where id = auth.uid()) = 'admin' );

create policy "Usuários podem ver seus próprios registros."
  on daily_entries for select
  using ( auth.uid() = user_id or (select role from profiles where id = auth.uid()) = 'admin' );

create policy "Usuários podem atualizar seus registros."
  on daily_entries for update
  using ( auth.uid() = user_id or (select role from profiles where id = auth.uid()) = 'admin' );

create policy "Usuários podem deletar seus registros."
  on daily_entries for delete
  using ( auth.uid() = user_id or (select role from profiles where id = auth.uid()) = 'admin' );

-- 3. Gatilho (Trigger) para criar automaticamente um perfil quando um novo usuário se cadastrar usando o Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Tabela de Slides Globais (global_slides)
create table if not exists public.global_slides (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  content text,
  media_url text,
  media_type text,
  bg_color text,
  text_config jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativa RLS para global_slides
alter table public.global_slides enable row level security;

drop policy if exists "Todos podem ver os slides." on global_slides;
drop policy if exists "Apenas admin pode modificar os slides." on global_slides;
drop policy if exists "Apenas admin pode criar slides." on global_slides;
drop policy if exists "Apenas admin pode deletar slides." on global_slides;

-- Qualquer um logado pode ver
create policy "Todos podem ver os slides."
  on global_slides for select
  using ( auth.uid() is not null );

-- Apenas o e-mail do admin pode inserir, atualizar e deletar
create policy "Apenas admin pode criar slides."
  on global_slides for insert
  with check ( (select email from profiles where id = auth.uid()) = 'renatofs.rcc@gmail.com' );

create policy "Apenas admin pode modificar os slides."
  on global_slides for update
  using ( (select email from profiles where id = auth.uid()) = 'renatofs.rcc@gmail.com' );

create policy "Apenas admin pode deletar slides."
  on global_slides for delete
  using ( (select email from profiles where id = auth.uid()) = 'renatofs.rcc@gmail.com' );

