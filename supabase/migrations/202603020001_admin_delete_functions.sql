-- ============================================================
-- ADMIN DELETE FUNCTIONS
-- ProjectHub – Server-side helpers for all admin-panel deletions
--
-- Affected tabs: Projects, Users, Tasks, Stages, Files
--
-- Problem: Supabase RLS silently blocks a DELETE that doesn't match
--   the policy (no error returned, 0 rows affected). The admin panel
--   showed a false-positive "deleted" message because the JS code
--   only checked for an error object, not the affected-row count.
--
-- Solution: SECURITY DEFINER functions run as the table-owner role
--   (bypassing RLS). They perform an internal is_admin() check so
--   only real admins can invoke them via RPC.
-- ============================================================

-- ── 1. Admin project deletion ─────────────────────────────────────────
-- Deletes a project (and its cascade-linked tasks/files/members) while
-- bypassing RLS. Returns TRUE on success, raises an exception otherwise.

CREATE OR REPLACE FUNCTION public.admin_delete_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_deleted INT;
BEGIN
  -- Gate: caller must be an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  DELETE FROM public.projects
  WHERE  id = p_project_id;

  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;

  IF v_rows_deleted = 0 THEN
    RAISE EXCEPTION 'Project not found or already deleted';
  END IF;

  RETURN TRUE;
END;
$$;

-- Revoke public execute; only authenticated users can call it
-- (is_admin() guard inside ensures only true admins succeed)
REVOKE ALL ON FUNCTION public.admin_delete_project(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_delete_project(UUID) TO authenticated;


-- ── 2. Admin user deletion ────────────────────────────────────────────
-- Soft-deletes a user by anonymising their profile and deleting their
-- own projects and data. Hard-deleting from auth.users requires the
-- service-role key or a Supabase management API call; this function
-- handles everything that the anon-key client can reach.

CREATE OR REPLACE FUNCTION public.admin_delete_user_data(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  -- Gate: caller must be an admin and cannot delete themselves
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Admins cannot delete their own account via this function';
  END IF;

  -- Delete all projects owned by the user (cascade removes tasks/files/members)
  DELETE FROM public.projects WHERE user_id = p_user_id;

  -- Remove the user from any project memberships
  DELETE FROM public.project_members WHERE user_id = p_user_id;

  -- Anonymise the profile (keeps row for FK integrity in audit logs)
  UPDATE public.profiles
  SET
    full_name    = 'Deleted User',
    bio          = NULL,
    avatar_url   = NULL,
    avatar_color = '#6c757d'
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user_data(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_delete_user_data(UUID) TO authenticated;


-- ── 3. Admin task deletion ────────────────────────────────────────────
-- RLS on tasks checks project ownership, so an admin deleting a task
-- from another user's project is silently blocked without this helper.

CREATE OR REPLACE FUNCTION public.admin_delete_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_deleted INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  DELETE FROM public.tasks WHERE id = p_task_id;
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;

  IF v_rows_deleted = 0 THEN
    RAISE EXCEPTION 'Task not found or already deleted';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_task(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_delete_task(UUID) TO authenticated;


-- ── 4. Admin stage deletion ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_delete_stage(p_stage_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_deleted INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  DELETE FROM public.project_stages WHERE id = p_stage_id;
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;

  IF v_rows_deleted = 0 THEN
    RAISE EXCEPTION 'Stage not found or already deleted';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_stage(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_delete_stage(UUID) TO authenticated;


-- ── 5. Admin file record deletion ────────────────────────────────────
-- Removes the project_files DB row. The actual storage object is
-- deleted separately by the client-side code using the storage path.

CREATE OR REPLACE FUNCTION public.admin_delete_file(p_file_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_deleted INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  DELETE FROM public.project_files WHERE id = p_file_id;
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;

  IF v_rows_deleted = 0 THEN
    RAISE EXCEPTION 'File record not found or already deleted';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_file(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_delete_file(UUID) TO authenticated;


-- ══════════════════════════════════════════════════════════════
-- UPDATE FUNCTIONS
-- Same RLS bypass problem applies to UPDATE statements.
-- ══════════════════════════════════════════════════════════════

-- ── 6. Admin update project ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_update_project(
  p_project_id UUID,
  p_title      TEXT,
  p_status     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  UPDATE public.projects
  SET    title = p_title, status = p_status, updated_at = NOW()
  WHERE  id = p_project_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Project not found'; END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_project(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_update_project(UUID, TEXT, TEXT) TO authenticated;


-- ── 7. Admin update stage ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_update_stage(
  p_stage_id   UUID,
  p_title      TEXT,
  p_status     TEXT,
  p_sort_order INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  UPDATE public.project_stages
  SET    title = p_title, status = p_status, sort_order = p_sort_order
  WHERE  id = p_stage_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Stage not found'; END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_stage(UUID, TEXT, TEXT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_update_stage(UUID, TEXT, TEXT, INT) TO authenticated;


-- ── 8. Admin update task ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_update_task(
  p_task_id  UUID,
  p_title    TEXT,
  p_status   TEXT,
  p_priority TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  UPDATE public.tasks
  SET    title = p_title, status = p_status, priority = p_priority
  WHERE  id = p_task_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Task not found'; END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_task(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_update_task(UUID, TEXT, TEXT, TEXT) TO authenticated;


-- ── 9. Admin update file metadata ───────────────────────────

CREATE OR REPLACE FUNCTION public.admin_update_file(
  p_file_id   UUID,
  p_file_name TEXT,
  p_category  TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  UPDATE public.project_files
  SET    file_name = p_file_name, category = p_category
  WHERE  id = p_file_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'File record not found'; END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_file(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_update_file(UUID, TEXT, TEXT) TO authenticated;


-- ── 10. Admin update user role ───────────────────────────────
-- Replaces the 3-step client-side flow (delete user_roles row,
-- insert new row, update profiles.role) with a single atomic call.

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_user_id    UUID,
  p_new_role   TEXT,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id SMALLINT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  -- Look up the role id
  SELECT id INTO v_role_id FROM public.roles WHERE name = p_new_role LIMIT 1;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Unknown role: %', p_new_role;
  END IF;

  -- Replace the user_roles row
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.user_roles (user_id, role_id, assigned_by)
  VALUES (p_user_id, v_role_id, p_assigned_by);

  -- Keep profiles.role in sync
  UPDATE public.profiles SET role = p_new_role WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_role(UUID, TEXT, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT, UUID) TO authenticated;
