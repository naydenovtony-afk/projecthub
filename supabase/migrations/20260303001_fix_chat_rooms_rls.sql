-- Fix chat_rooms SELECT policy to allow project members to discover project rooms
-- even before they are added as chat_participants.

DROP POLICY IF EXISTS chat_rooms_select ON public.chat_rooms;

CREATE POLICY chat_rooms_select ON public.chat_rooms
  FOR SELECT USING (
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
