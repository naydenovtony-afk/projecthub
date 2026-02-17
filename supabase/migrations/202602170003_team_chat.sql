-- Team Chat System Schema
-- Comprehensive messaging system for team collaboration
-- Supports project-based group chats and direct messages

-- Chat rooms table (group chats for projects or direct messages)
create table if not exists public.chat_rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  room_type text not null check (room_type in ('project', 'direct', 'group')),
  project_id uuid references public.projects(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_message_at timestamp with time zone,
  is_archived boolean default false
);

comment on table public.chat_rooms is 'Chat rooms for team collaboration';
comment on column public.chat_rooms.room_type is 'Type: project (project team), direct (1-on-1), group (custom group)';
comment on column public.chat_rooms.project_id is 'Associated project for project-based chats';

-- Chat participants table (who is in each chat room)
create table if not exists public.chat_participants (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  last_read_at timestamp with time zone default now(),
  is_admin boolean default false,
  is_muted boolean default false,
  unique(room_id, user_id)
);

comment on table public.chat_participants is 'Users participating in chat rooms';
comment on column public.chat_participants.last_read_at is 'Last time user read messages in this room';

-- Chat messages table
create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  message_type text default 'text' check (message_type in ('text', 'file', 'system')),
  file_url text,
  file_name text,
  reply_to_id uuid references public.chat_messages(id) on delete set null,
  is_edited boolean default false,
  is_deleted boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table public.chat_messages is 'Messages in chat rooms';
comment on column public.chat_messages.message_type is 'Type: text, file, or system message';
comment on column public.chat_messages.reply_to_id is 'Reference to message being replied to';

-- Enable RLS
alter table public.chat_rooms enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

-- Chat Rooms Policies
drop policy if exists chat_rooms_select on public.chat_rooms;
create policy chat_rooms_select on public.chat_rooms
  for select using (
    -- User is a participant or admin
    exists (
      select 1 from public.chat_participants
      where room_id = chat_rooms.id and user_id = auth.uid()
    ) or public.is_admin()
  );

drop policy if exists chat_rooms_insert on public.chat_rooms;
create policy chat_rooms_insert on public.chat_rooms
  for insert with check (
    created_by = auth.uid() or public.is_admin()
  );

drop policy if exists chat_rooms_update on public.chat_rooms;
create policy chat_rooms_update on public.chat_rooms
  for update using (
    created_by = auth.uid() or
    exists (
      select 1 from public.chat_participants
      where room_id = chat_rooms.id and user_id = auth.uid() and is_admin = true
    ) or public.is_admin()
  );

drop policy if exists chat_rooms_delete on public.chat_rooms;
create policy chat_rooms_delete on public.chat_rooms
  for delete using (
    created_by = auth.uid() or public.is_admin()
  );

-- Chat Participants Policies
drop policy if exists chat_participants_select on public.chat_participants;
create policy chat_participants_select on public.chat_participants
  for select using (
    -- User can see participants in rooms they're in
    exists (
      select 1 from public.chat_participants cp
      where cp.room_id = chat_participants.room_id and cp.user_id = auth.uid()
    ) or public.is_admin()
  );

drop policy if exists chat_participants_insert on public.chat_participants;
create policy chat_participants_insert on public.chat_participants
  for insert with check (
    -- Room admin or creator can add participants
    exists (
      select 1 from public.chat_rooms
      where id = room_id and created_by = auth.uid()
    ) or
    exists (
      select 1 from public.chat_participants
      where room_id = chat_participants.room_id and user_id = auth.uid() and is_admin = true
    ) or public.is_admin()
  );

drop policy if exists chat_participants_update on public.chat_participants;
create policy chat_participants_update on public.chat_participants
  for update using (
    -- Users can update their own participation
    user_id = auth.uid() or
    exists (
      select 1 from public.chat_participants
      where room_id = chat_participants.room_id and user_id = auth.uid() and is_admin = true
    ) or public.is_admin()
  );

drop policy if exists chat_participants_delete on public.chat_participants;
create policy chat_participants_delete on public.chat_participants
  for delete using (
    -- Users can leave, admins can remove
    user_id = auth.uid() or
    exists (
      select 1 from public.chat_participants
      where room_id = chat_participants.room_id and user_id = auth.uid() and is_admin = true
    ) or public.is_admin()
  );

-- Chat Messages Policies
drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select using (
    -- User is in the room
    exists (
      select 1 from public.chat_participants
      where room_id = chat_messages.room_id and user_id = auth.uid()
    ) or public.is_admin()
  );

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages
  for insert with check (
    -- User is in the room
    user_id = auth.uid() and
    exists (
      select 1 from public.chat_participants
      where room_id = chat_messages.room_id and user_id = auth.uid()
    ) or public.is_admin()
  );

drop policy if exists chat_messages_update on public.chat_messages;
create policy chat_messages_update on public.chat_messages
  for update using (
    -- User can edit their own messages
    user_id = auth.uid() or public.is_admin()
  );

drop policy if exists chat_messages_delete on public.chat_messages;
create policy chat_messages_delete on public.chat_messages
  for delete using (
    -- User can delete their own messages or room admin
    user_id = auth.uid() or
    exists (
      select 1 from public.chat_participants
      where room_id = chat_messages.room_id and user_id = auth.uid() and is_admin = true
    ) or public.is_admin()
  );

-- Indexes for efficient queries
create index if not exists idx_chat_rooms_project_id on public.chat_rooms(project_id);
create index if not exists idx_chat_rooms_created_by on public.chat_rooms(created_by);
create index if not exists idx_chat_rooms_type on public.chat_rooms(room_type);
create index if not exists idx_chat_rooms_last_message on public.chat_rooms(last_message_at desc);

create index if not exists idx_chat_participants_room_id on public.chat_participants(room_id);
create index if not exists idx_chat_participants_user_id on public.chat_participants(user_id);
create index if not exists idx_chat_participants_composite on public.chat_participants(room_id, user_id);

create index if not exists idx_chat_messages_room_id on public.chat_messages(room_id);
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(room_id, created_at desc);
create index if not exists idx_chat_messages_reply_to on public.chat_messages(reply_to_id);

-- Function to update room's last_message_at
create or replace function update_chat_room_last_message()
returns trigger as $$
begin
  update public.chat_rooms
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.room_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to update last_message_at
drop trigger if exists trigger_update_chat_room_last_message on public.chat_messages;
create trigger trigger_update_chat_room_last_message
  after insert on public.chat_messages
  for each row
  execute function update_chat_room_last_message();

-- Function to get unread message count for a user in a room
create or replace function get_unread_count(p_room_id uuid, p_user_id uuid)
returns integer as $$
declare
  v_last_read timestamp with time zone;
  v_unread_count integer;
begin
  -- Get user's last read timestamp
  select last_read_at into v_last_read
  from public.chat_participants
  where room_id = p_room_id and user_id = p_user_id;
  
  -- Count messages after last read
  select count(*)::integer into v_unread_count
  from public.chat_messages
  where room_id = p_room_id 
    and created_at > v_last_read
    and user_id != p_user_id
    and is_deleted = false;
  
  return coalesce(v_unread_count, 0);
end;
$$ language plpgsql security definer;

-- Revoke public access
revoke all on public.chat_rooms from public;
revoke all on public.chat_participants from public;
revoke all on public.chat_messages from public;
