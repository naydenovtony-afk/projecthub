-- Fix infinite recursion in chat_participants RLS policies
-- The original chat_participants_select policy queries chat_participants from within itself,
-- causing infinite recursion. Replace with non-self-referential checks.

-- ─── chat_participants SELECT ─────────────────────────────────────────────────
DROP POLICY IF EXISTS chat_participants_select ON public.chat_participants;

CREATE POLICY chat_participants_select ON public.chat_participants
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      -- User can see their own participant row
      user_id = auth.uid()
      OR
      -- User is a member of the project the room belongs to
      EXISTS (
        SELECT 1 FROM public.chat_rooms cr
        JOIN public.project_members pm ON pm.project_id = cr.project_id
        WHERE cr.id = chat_participants.room_id AND pm.user_id = auth.uid()
      )
      OR
      -- Global room: any authenticated user can see participants
      EXISTS (
        SELECT 1 FROM public.chat_rooms cr
        WHERE cr.id = chat_participants.room_id AND cr.room_type = 'global'
      )
      OR public.is_admin()
    )
  );

-- ─── chat_participants INSERT ─────────────────────────────────────────────────
-- Simplified: authenticated users can add themselves to any room they have access to
DROP POLICY IF EXISTS chat_participants_insert ON public.chat_participants;

CREATE POLICY chat_participants_insert ON public.chat_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Can join global rooms freely
      EXISTS (
        SELECT 1 FROM public.chat_rooms
        WHERE id = room_id AND room_type = 'global'
      )
      OR
      -- Can join project rooms if a project member
      EXISTS (
        SELECT 1 FROM public.chat_rooms cr
        JOIN public.project_members pm ON pm.project_id = cr.project_id
        WHERE cr.id = room_id AND pm.user_id = auth.uid()
      )
      OR
      -- Room creator
      EXISTS (
        SELECT 1 FROM public.chat_rooms
        WHERE id = room_id AND created_by = auth.uid()
      )
      OR public.is_admin()
    )
  );

-- ─── chat_participants UPDATE ─────────────────────────────────────────────────
DROP POLICY IF EXISTS chat_participants_update ON public.chat_participants;

CREATE POLICY chat_participants_update ON public.chat_participants
  FOR UPDATE USING (
    user_id = auth.uid() OR public.is_admin()
  );

-- ─── chat_participants DELETE ─────────────────────────────────────────────────
DROP POLICY IF EXISTS chat_participants_delete ON public.chat_participants;

CREATE POLICY chat_participants_delete ON public.chat_participants
  FOR DELETE USING (
    user_id = auth.uid() OR public.is_admin()
  );
