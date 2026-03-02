-- ============================================================
-- Fix admin_delete_project: delete project_members first
--
-- Root cause: the prevent_last_pm trigger fires BEFORE DELETE
-- on project_members for each row.  When a project is deleted and
-- the cascade tries to remove the lone PM member row, the trigger
-- sees "last PM remaining" and raises an exception, aborting the
-- whole transaction.
--
-- Fix: explicitly delete all project_members for the project inside
-- the admin function BEFORE the project row is deleted, so the
-- cascade never needs to touch project_members.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delete_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = OFF
AS $$
DECLARE v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  -- Remove all member rows first so the prevent_last_pm trigger
  -- never fires during the cascade delete of the project.
  DELETE FROM public.project_members WHERE project_id = p_project_id;

  -- Now delete the project; all remaining FK children cascade cleanly.
  DELETE FROM public.projects WHERE id = p_project_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Project not found or already deleted'; END IF;

  RETURN TRUE;
END;
$$;
