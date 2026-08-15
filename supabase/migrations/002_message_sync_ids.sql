-- Adds stable browser-generated message IDs so retries cannot duplicate chats.
-- Run this once after 001_sewing_emotions_foundation.sql.

alter table public.messages
add column if not exists source_message_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_character_source_message_key'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
    add constraint messages_character_source_message_key
    unique (character_id, source_message_id);
  end if;
end;
$$;
