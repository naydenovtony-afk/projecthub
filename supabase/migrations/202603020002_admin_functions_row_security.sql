-- ============================================================
-- Fix admin CRUD functions: add SET row_security = OFF
--
-- In Supabase's hosted environment the function owner may not
-- be a PostgreSQL superuser, so SECURITY DEFINER alone does not
-- guarantee that RLS is bypassed.  Adding SET row_security = OFF
-- forces RLS off inside the function regardless of the owner's role.
--
-- Also removes the non-existent avatar_color column reference from
-- admin_delete_user_data.
-- ============================================================

-- ── 1. Project delete ─────────────────────────────────────────
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
  DELETE FROM public.projects WHERE id = p_project_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Project not found or already deleted'; END IF;
  RETURN TRUE;
END;
$$;

-- ── 2. User data delete ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_user_data(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = OFF
AS $$
DECLARE v_caller_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;
  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Admins cannot delete their own account via this function';
  END IF;
  DELETE FROM public.projects       WHERE user_id    = p_user_id;
  DELETE FROM public.project_members WHERE user_id   = p_user_id;
  UPDATE public.profiles
    SET full_name = 'Deleted User', bio = NULL, avatar_url = NULL
  WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

-- ── 3. Task delete ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = OFF
AS $$
DECLARE v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied: admin role required'; END IF;
  DELETE FROM public.tasks WHERE id = p_task_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Task not found or already deleted'; END IF;
  RETURN TRUE;
END;
$$;

-- ── 4. Stage delete ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_stage(p_stage_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = OFF
AS $$
DECLARE v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied: admin role required'; END IF;
  DELETE FROM public.project_stages WHERE id = p_stage_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Stage not found or already deleted'; END IF;
  RETURN TRUE;
END;
$$;

-- ── 5. File delete ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_file(p_file_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = OFF
AS $$
DECLARE v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied: admin role required'; END IF;
  DELETE FROM public.project_files WHERE id = p_file_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'File record not found or already deleted'; END IF;
  RETURN TRUE;
END;
$$;

-- ── 6. Project update ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_project(p_project_id UUID, p_title TEXT, p_status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = OFF
AS $$
DECLARE v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied: admin role required'; END IF;
  UPDATE public.projects SET title = p_title, status = p_status, updated_at = NOW() WHERE id = p_project_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Project not found'; END IF;
  RETURN TRUE;
END;
$$;

-- ── 7. Stage update ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_stage(p_stage_id UUID, p_title TEXT, p_status TEXT, p_sort_order INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = OFF
AS $$
DECLARE v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied: admin role required'; END IF;
  UPDATE public.project_stages SET title = p_title, status = p_status, sort_order = p_sort_order WHERE id = p_stage_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Stage not found'; END IF;
  RETURN TRUE;
END;
$$;

-- ── 8. Task update ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_task(p_task_id UUID, p_title TEXT, p_status TEXT, p_priority TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = OFF
AS $$
DECLARE v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied: admin role required'; END IF;
  UPDATE public.tasks SET title = p_title, status = p_status, priority = p_priority WHERE id = p_task_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Task not found'; END IF;
  RETURN TRUE;
END;
$$;

-- ── 9. File update ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_file(p_file_id UUID, p_file_name TEXT, p_category TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = OFF
AS $$
DECLARE v_rows INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied: admin role required'; END IF;
  UPDATE public.project_files SET file_name = p_file_name, category = p_category WHERE id = p_file_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'File record not found'; END IF;
  RETURN TRUE;
END;
$$;

-- ── 10. User role update ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_user_role(p_user_id UUID, p_new_role TEXT, p_assigned_by UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = OFF
AS $$
DECLARE v_role_id SMALLINT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied: admin role required'; END IF;
  SELECT id INTO v_role_id FROM public.roles WHERE name = p_new_role LIMIT 1;
  IF v_role_id IS NULL THEN RAISE EXCEPTION 'Unknown role: %', p_new_role; END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.user_roles (user_id, role_id, assigned_by) VALUES (p_user_id, v_role_id, p_assigned_by);
  UPDATE public.profiles SET role = p_new_role WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;
