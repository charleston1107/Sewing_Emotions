-- Sewing Emotions: account, character, chat, and image-storage foundation.
-- Run this file once in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled emotion' check (char_length(name) between 1 and 100),
  image_path text,
  design_choices jsonb not null default '{}'::jsonb,
  mapping_hints jsonb not null default '{}'::jsonb,
  emotion_profile jsonb not null default '{}'::jsonb,
  personality_profile jsonb not null default '{}'::jsonb,
  conversation_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  character_id uuid not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);

create index if not exists characters_user_updated_idx
  on public.characters (user_id, updated_at desc);

create index if not exists messages_character_created_idx
  on public.messages (character_id, created_at asc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at
before update on public.characters
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', '')
from auth.users
on conflict (id) do nothing;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.messages enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.characters from anon, authenticated;
revoke all on table public.messages from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.characters to authenticated;
grant select, insert on table public.messages to authenticated;
grant usage, select on sequence public.messages_id_seq to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own characters" on public.characters;
create policy "Users can read their own characters"
on public.characters for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own characters" on public.characters;
create policy "Users can create their own characters"
on public.characters for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own characters" on public.characters;
create policy "Users can update their own characters"
on public.characters for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own characters" on public.characters;
create policy "Users can delete their own characters"
on public.characters for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read messages for their characters" on public.messages;
create policy "Users can read messages for their characters"
on public.messages for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.characters
    where characters.id = messages.character_id
      and characters.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can create messages for their characters" on public.messages;
create policy "Users can create messages for their characters"
on public.messages for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.characters
    where characters.id = messages.character_id
      and characters.user_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'emotion-characters',
  'emotion-characters',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their own character images" on storage.objects;
create policy "Users can view their own character images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'emotion-characters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload their own character images" on storage.objects;
create policy "Users can upload their own character images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'emotion-characters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their own character images" on storage.objects;
create policy "Users can update their own character images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'emotion-characters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'emotion-characters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their own character images" on storage.objects;
create policy "Users can delete their own character images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'emotion-characters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
