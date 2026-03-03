-- Fix RLS policies for global chat room support
-- Replaces the overly complex policies from 20260303002 with simpler, safe ones

-- ─── chat_rooms SELECT ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS chat_rooms_select ON public.chat_rooms;

CREATE POLICY chat_rooms_select ON public.chat_rooms
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      -- Global room: visible to all authenticated users
      room_type = 'global'
      OR
      -- User is a participant in this room
      EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE room_id = chat_rooms.id AND user_id = auth.uid()
      )
      OR
      -- User is a member of the project this room belongs to
      (
        project_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM public.project_members
          WHERE project_id = chat_rooms.project_id AND user_id = auth.uid()
        )
      )
      OR
      -- Project owner
      (
        project_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE id = chat_rooms.project_id AND user_id = auth.uid()
        )
      )
    )
  );

-- ─── chat_participants INSERT ─────────────────────────────────────────────────
-- Keep it simple: authenticated users can add themselves
DROP POLICY IF EXISTS chat_participants_insert ON public.chat_participants;

CREATE POLICY chat_participants_insert ON public.chat_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── chat_messages SELECT ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;

CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      -- Global room messages visible to all authenticated users
      EXISTS (
        SELECT 1 FROM public.chat_rooms
        WHERE id = room_id AND room_type = 'global'
      )
      OR
      -- User is a participant in this room
      EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
      )
    )
  );

-- ─── chat_messages INSERT ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;

CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Global room: any authenticated user can post
      EXISTS (
        SELECT 1 FROM public.chat_rooms
        WHERE id = room_id AND room_type = 'global'
      )
      OR
      -- Participant can post in their rooms
      EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
      )
    )
  );
