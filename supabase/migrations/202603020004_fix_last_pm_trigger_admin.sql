-- ============================================================
-- Fix prevent_last_pm_removal trigger to allow admin project deletion
--
-- Problem: the trigger fires on EVERY deletion of a project_members
-- row (including the explicit DELETE inside admin_delete_project),
-- sees "last PM remaining" and raises — blocking the whole operation.
--
-- Fix:
--   1. Modify prevent_last_pm_removal() to skip when a session-local
--      flag 'app.admin_deleting_project' = 'true' is set.
--   2. admin_delete_project sets that flag, then deletes members,
--      then deletes the project.
-- ============================================================

-- Step 1: Update the trigger guard function
CREATE OR REPLACE FUNCTION public.prevent_last_pm_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow deletion when an admin is explicitly removing a project
  IF current_setting('app.admin_deleting_project', true) = 'true' THEN
    RETURN OLD;
  END IF;

  IF OLD.role = 'project_manager' THEN
    IF (SELECT COUNT(*) FROM public.project_members
        WHERE project_id = OLD.project_id AND role = 'project_manager') = 1 THEN
      RAISE EXCEPTION 'Cannot remove the last Project Manager from project %', OLD.project_id
        USING ERRCODE = 'raise_exception';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- Step 2: Update admin_delete_project to set the flag before deleting members
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

  -- Signal to prevent_last_pm_removal that this is an admin project deletion.
  -- The flag is local to this transaction (third arg = true).
  PERFORM set_config('app.admin_deleting_project', 'true', true);

  -- Delete all member rows first (trigger will be skipped due to flag above).
  DELETE FROM public.project_members WHERE project_id = p_project_id;

  -- Clear the flag before deleting the project (cascade has nothing left anyway).
  PERFORM set_config('app.admin_deleting_project', 'false', true);

  -- Delete the project; all remaining FK children cascade cleanly.
  DELETE FROM public.projects WHERE id = p_project_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Project not found or already deleted'; END IF;

  RETURN TRUE;
END;
$$;
