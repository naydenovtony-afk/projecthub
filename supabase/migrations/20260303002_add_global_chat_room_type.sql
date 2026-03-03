-- Add 'global' room type to chat_rooms and allow all authenticated users access

-- 1. Drop old constraint and recreate with 'global' included
ALTER TABLE public.chat_rooms
  DROP CONSTRAINT IF EXISTS chat_rooms_room_type_check;

ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_room_type_check
  CHECK (room_type IN ('project', 'direct', 'group', 'global'));

-- 2. Update SELECT policy to also allow any authenticated user to see global rooms
DROP POLICY IF EXISTS chat_rooms_select ON public.chat_rooms;

CREATE POLICY chat_rooms_select ON public.chat_rooms
  FOR SELECT USING (
    -- Any authenticated user can see the global room
    (room_type = 'global' AND auth.uid() IS NOT NULL)
    OR
    -- User is already a participant
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE room_id = chat_rooms.id AND user_id = auth.uid()
    )
    OR
    -- User is a member of the associated project (for project rooms)
    (
      project_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = chat_rooms.project_id AND user_id = auth.uid()
      )
    )
    OR
    -- Project owner can always see their project rooms
    (
      project_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = chat_rooms.project_id AND user_id = auth.uid()
      )
    )
    OR public.is_admin()
  );

-- 3. Allow any authenticated user to insert a participant row for the global room
DROP POLICY IF EXISTS chat_participants_insert ON public.chat_participants;

CREATE POLICY chat_participants_insert ON public.chat_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Always allowed for global rooms
      EXISTS (
        SELECT 1 FROM public.chat_rooms
        WHERE id = room_id AND room_type = 'global'
      )
      OR
      -- Project member can join project rooms
      EXISTS (
        SELECT 1 FROM public.chat_rooms cr
        JOIN public.project_members pm ON pm.project_id = cr.project_id
        WHERE cr.id = room_id AND pm.user_id = auth.uid()
      )
      OR
      -- Existing participant (admins can add others)
      EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE room_id = chat_participants.room_id
          AND user_id = auth.uid()
          AND is_admin = true
      )
      OR public.is_admin()
    )
  );

-- 4. Allow any authenticated user to read/write messages in global rooms
DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;

CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT USING (
    -- Global room messages visible to all authenticated users
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = room_id AND room_type = 'global' AND auth.uid() IS NOT NULL
    )
    OR
    -- User is a participant in the room
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;

CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Global room: any authenticated user can post
      EXISTS (
        SELECT 1 FROM public.chat_rooms
        WHERE id = room_id AND room_type = 'global' AND auth.uid() IS NOT NULL
      )
      OR
      -- Participant can post in their rooms
      EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
      )
      OR public.is_admin()
    )
  );
