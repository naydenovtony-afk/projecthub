-- Messages schema for internal messaging system
-- Allows users to send messages to each other
-- 
-- NOTE: This schema is kept for reference but is currently not in use.
-- The application uses Team Chat (team-chat.js) for all messaging functionality
-- to avoid duplicate features and simplify the architecture.
-- Related files archived: messages.html, messages.js, messageService.js

create extension if not exists pgcrypto;

-- Messages table
create table if not exists public.messages (
	id uuid primary key default gen_random_uuid(),
	sender_id uuid not null references public.profiles(id) on delete cascade,
	recipient_id uuid not null references public.profiles(id) on delete cascade,
	subject text not null,
	body text not null,
	is_read boolean default false,
	parent_message_id uuid references public.messages(id) on delete set null,
	created_at timestamp with time zone default now(),
	read_at timestamp with time zone
);

comment on table public.messages is 'Internal messaging between users';
comment on column public.messages.parent_message_id is 'Reference to parent message for threading/replies';

-- Enable RLS
alter table public.messages enable row level security;

-- Messages policies
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
	for select using (
		sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin()
	);

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
	for insert with check (
		sender_id = auth.uid() or public.is_admin()
	);

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
	for update using (
		recipient_id = auth.uid() or public.is_admin()
	);

drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
	for delete using (
		sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin()
	);

-- Indexes for efficient queries
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_recipient_id on public.messages(recipient_id);
create index if not exists idx_messages_is_read on public.messages(is_read);
create index if not exists idx_messages_created_at on public.messages(created_at);
create index if not exists idx_messages_parent_message_id on public.messages(parent_message_id);

-- Revoke public access
revoke all on public.messages from public;
