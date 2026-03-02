-- ============================================================
-- Fix prevent_last_pm_removal for regular project deletion
--
-- Root cause: when ANY user (not just admin) deletes their project,
-- PostgreSQL cascades the delete to project_members. The trigger
-- fires for every row deleted and raises an exception when it sees
-- the last PM row being removed, rolling back the entire transaction.
--
-- The admin path was fixed in migration 202603020004 via a session
-- flag set inside admin_delete_project(). But the regular user path
-- (direct DELETE on projects table via RLS) was not handled.
--
-- Fix: before checking the PM count, verify the parent project still
-- exists. During a cascade the parent row is already gone, so this
-- check short-circuits and allows the deletion cleanly.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_last_pm_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow deletion bypassed by the admin project-deletion flag (set in
  -- admin_delete_project() function).
  IF current_setting('app.admin_deleting_project', true) = 'true' THEN
    RETURN OLD;
  END IF;

  -- Allow deletion when this is a CASCADE triggered by the parent project
  -- being deleted. If the parent project row no longer exists we are inside
  -- a cascade – let it proceed so that owners can delete their own projects.
  IF NOT EXISTS (
    SELECT 1 FROM public.projects WHERE id = OLD.project_id
  ) THEN
    RETURN OLD;
  END IF;

  -- Normal case: prevent explicitly removing (not cascading) the last PM.
  IF OLD.role = 'project_manager' THEN
    IF (
      SELECT COUNT(*) FROM public.project_members
      WHERE  project_id = OLD.project_id
        AND  role       = 'project_manager'
    ) = 1 THEN
      RAISE EXCEPTION 'Cannot remove the last Project Manager from project %', OLD.project_id
        USING ERRCODE = 'raise_exception';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;
