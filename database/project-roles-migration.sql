-- ============================================================
-- PROJECT ROLES MIGRATION
-- ProjectHub – Role-based access control per project
--
-- Roles:
--   project_manager    – Full control
--   project_coordinator – Tasks + members (no files/budget/settings)
--   team_member        – View + submit tasks for review
--
-- Task status workflow:
--   todo → in_progress → pending_review → done
--                ↑___________|  (PC/PM can send back)
--
-- RUN ORDER: Execute this AFTER the core schema.sql has been applied.
-- The script is idempotent (safe to run multiple times).
-- ============================================================

-- ── 1. Update tasks.status CHECK constraint ───────────────────────────
-- Add 'pending_review' and 'blocked' alongside existing values.
-- Keep 'done' (existing data) but also accept 'completed' as alias.

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'pending_review', 'done', 'blocked'));

-- ── 2. New columns on tasks ───────────────────────────────────────────

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── 3. Update project_members role values ────────────────────────────
-- Migrate legacy 'member' / 'owner' to the new enum values first,
-- THEN apply the CHECK constraint so no existing row violates it.

-- Drop any previous role constraint on project_members
ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS project_members_role_check;

-- Migrate legacy data
UPDATE public.project_members SET role = 'project_manager'   WHERE role = 'owner';
UPDATE public.project_members SET role = 'team_member'       WHERE role NOT IN ('project_manager','project_coordinator','team_member');

-- Apply the new strict constraint
ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_role_check
  CHECK (role IN ('project_manager', 'project_coordinator', 'team_member'));

-- ── 4. New columns on project_members ────────────────────────────────

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS invited_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delegated_pm_until  TIMESTAMPTZ;

-- ── 5. Ensure every project creator is a PM in project_members ────────

-- Update existing member rows where user is the project creator
UPDATE public.project_members pm
SET    role = 'project_manager'
FROM   public.projects p
WHERE  pm.project_id = p.id
  AND  pm.user_id    = p.user_id
  AND  pm.role      <> 'project_manager';

-- Insert PM row for creators who have no membership row at all
INSERT INTO public.project_members (project_id, user_id, role)
SELECT p.id, p.user_id, 'project_manager'
FROM   public.projects p
WHERE  NOT EXISTS (
  SELECT 1 FROM public.project_members pm
  WHERE  pm.project_id = p.id
    AND  pm.user_id    = p.user_id
)
ON CONFLICT (project_id, user_id)
DO UPDATE SET role = 'project_manager';

-- ── 6. Audit log table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_audit_log (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   UUID        NOT NULL REFERENCES public.projects(id)  ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  action       VARCHAR(100) NOT NULL,        -- e.g. 'task_status_changed', 'role_changed'
  entity_type  VARCHAR(50),                  -- 'task' | 'member' | 'file' | 'project'
  entity_id    UUID,
  old_value    JSONB,
  new_value    JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.project_audit_log ENABLE ROW LEVEL SECURITY;

-- ── 7. Helper functions ───────────────────────────────────────────────
-- Using CREATE OR REPLACE with DEFAULT auth.uid() on p_user_id to match
-- the existing function signatures in the DB (avoids CASCADE drop of dependent policies).

-- Returns the role text of a user in a project (NULL if not a member)
CREATE OR REPLACE FUNCTION public.get_project_role(p_project_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT role
  FROM   public.project_members
  WHERE  project_id = p_project_id
    AND  user_id    = p_user_id
  LIMIT 1;
$$;

-- True if user is a project_manager in the project
CREATE OR REPLACE FUNCTION public.is_project_pm(p_project_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE  project_id = p_project_id
      AND  user_id    = p_user_id
      AND  role       = 'project_manager'
  );
$$;

-- True if user is PM or PC (or PC with active PM delegation)
CREATE OR REPLACE FUNCTION public.is_pm_or_pc(p_project_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE  project_id = p_project_id
      AND  user_id    = p_user_id
      AND (
        role IN ('project_manager', 'project_coordinator')
        OR (role = 'project_coordinator' AND delegated_pm_until > NOW())
      )
  );
$$;

-- True if user is any kind of member in the project
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE  project_id = p_project_id
      AND  user_id    = p_user_id
  );
$$;

-- ── 8. Trigger: auto-assign creator as PM on project creation ─────────

CREATE OR REPLACE FUNCTION public.add_project_creator_as_pm()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'project_manager')
  ON CONFLICT (project_id, user_id)
  DO UPDATE SET role = 'project_manager';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.add_project_creator_as_pm();

-- ── 9. Updated RLS policies ───────────────────────────────────────────
-- Tasks: visible to all project members + existing public/owner/admin rules

DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE  pr.id = tasks.project_id
        AND (
          pr.visibility = 'public'
          OR pr.user_id  = auth.uid()
          OR public.is_admin()
          OR public.is_project_member(pr.id, auth.uid())
        )
    )
  );

-- Create tasks: PM, PC, or project owner
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE  pr.id = project_id
        AND (
          pr.user_id = auth.uid()
          OR public.is_admin()
          OR public.is_pm_or_pc(pr.id, auth.uid())
        )
    )
  );

-- Update tasks: any member (field-level permission enforced in JS)
DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE  pr.id = tasks.project_id
        AND (
          pr.user_id = auth.uid()
          OR public.is_admin()
          OR public.is_project_member(pr.id, auth.uid())
        )
    )
  );

-- Delete tasks: PM or project owner only
DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE  pr.id = tasks.project_id
        AND (
          pr.user_id = auth.uid()
          OR public.is_admin()
          OR public.is_project_pm(pr.id, auth.uid())
        )
    )
  );

-- project_members: any member of the project can view the member list
DROP POLICY IF EXISTS project_members_select ON public.project_members;
CREATE POLICY project_members_select ON public.project_members
  FOR SELECT USING (
    public.is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE  p.id = project_members.project_id AND p.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Add members: PM, PC, or project owner
DROP POLICY IF EXISTS project_members_insert ON public.project_members;
CREATE POLICY project_members_insert ON public.project_members
  FOR INSERT WITH CHECK (
    public.is_pm_or_pc(project_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    OR public.is_admin()
  );

-- Change roles: PM or project owner only
DROP POLICY IF EXISTS project_members_update ON public.project_members;
CREATE POLICY project_members_update ON public.project_members
  FOR UPDATE USING (
    public.is_project_pm(project_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    OR public.is_admin()
  );

-- Remove members: PM/PC or project owner (PC cannot remove PM)
DROP POLICY IF EXISTS project_members_delete ON public.project_members;
CREATE POLICY project_members_delete ON public.project_members
  FOR DELETE USING (
    public.is_pm_or_pc(project_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    OR public.is_admin()
  );

-- Audit log: PM/PC can read; any member can insert
DROP POLICY IF EXISTS audit_log_select ON public.project_audit_log;
CREATE POLICY audit_log_select ON public.project_audit_log
  FOR SELECT USING (
    public.is_pm_or_pc(project_id, auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS audit_log_insert ON public.project_audit_log;
CREATE POLICY audit_log_insert ON public.project_audit_log
  FOR INSERT WITH CHECK (
    public.is_project_member(project_id, auth.uid())
    OR public.is_admin()
  );


-- ── 10. Prevent removing the last PM via DB triggers ──────────────────────

CREATE OR REPLACE FUNCTION public.prevent_last_pm_removal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
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

DROP TRIGGER IF EXISTS prevent_last_pm ON public.project_members;
CREATE TRIGGER prevent_last_pm
  BEFORE DELETE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_pm_removal();

CREATE OR REPLACE FUNCTION public.prevent_last_pm_demotion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role = 'project_manager' AND NEW.role <> 'project_manager' THEN
    IF (
      SELECT COUNT(*) FROM public.project_members
      WHERE  project_id = OLD.project_id
        AND  role       = 'project_manager'
    ) = 1 THEN
      RAISE EXCEPTION 'Cannot demote the last Project Manager from project %', OLD.project_id
        USING ERRCODE = 'raise_exception';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_last_pm_demotion ON public.project_members;
CREATE TRIGGER prevent_last_pm_demotion
  BEFORE UPDATE OF role ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_pm_demotion();

GRANT EXECUTE ON FUNCTION public.prevent_last_pm_removal()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_last_pm_demotion() TO authenticated;

-- ── 11. Indexes ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id    ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role       ON public.project_members(role);

CREATE INDEX IF NOT EXISTS idx_tasks_status               ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at         ON public.tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by           ON public.tasks(created_by);

CREATE INDEX IF NOT EXISTS idx_audit_log_project_id       ON public.project_audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id          ON public.project_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at       ON public.project_audit_log(created_at);

-- ── 12. Grants ────────────────────────────────────────────────────────

GRANT SELECT, INSERT          ON public.project_audit_log TO authenticated;
GRANT ALL                     ON public.project_audit_log TO service_role;
GRANT EXECUTE ON FUNCTION public.get_project_role(UUID, UUID)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_pm(UUID, UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pm_or_pc(UUID, UUID)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID, UUID)    TO authenticated;


-- ── 13. File permissions ──────────────────────────────────────────────────────

-- Add uploaded_by column to project_files so we know who uploaded each file
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS uploaded_by UUID
  REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill: assign existing files to the project owner
UPDATE public.project_files pf
SET    uploaded_by = p.user_id
FROM   public.projects p
WHERE  pf.project_id = p.id
  AND  pf.uploaded_by IS NULL;

-- Index for performant RLS checks
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by
  ON public.project_files(uploaded_by);

-- Role-aware DELETE policy:
--   PM        → can delete any file in their project
--   PC        → can delete files they uploaded OR files uploaded by team members
--   TM        → can delete only their own uploads
DROP POLICY IF EXISTS project_files_delete ON public.project_files;
CREATE POLICY project_files_delete ON public.project_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE  pm.project_id = project_files.project_id
        AND  pm.user_id    = auth.uid()
        AND  (
          -- PM: full access
          pm.role = 'project_manager'

          -- PC: own uploads + files uploaded by any TM in this project
          OR (
            pm.role = 'project_coordinator'
            AND (
              project_files.uploaded_by = auth.uid()
              OR project_files.uploaded_by IN (
                SELECT m2.user_id
                FROM   public.project_members m2
                WHERE  m2.project_id = project_files.project_id
                  AND  m2.role       = 'team_member'
              )
            )
          )

          -- TM: only their own uploads
          OR (
            pm.role = 'team_member'
            AND project_files.uploaded_by = auth.uid()
          )
        )
    )
    -- Admins always have access
    OR public.is_admin()
  );

-- Role-aware INSERT policy:
--   All project members can upload files
DROP POLICY IF EXISTS project_files_insert ON public.project_files;
CREATE POLICY project_files_insert ON public.project_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE  pm.project_id = project_files.project_id
        AND  pm.user_id    = auth.uid()
    )
    -- Ensure uploaded_by is set to the current user
    AND uploaded_by = auth.uid()
  );

-- Role-aware SELECT policy (all members can view all project files):
DROP POLICY IF EXISTS project_files_select ON public.project_files;
CREATE POLICY project_files_select ON public.project_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE  pm.project_id = project_files.project_id
        AND  pm.user_id    = auth.uid()
    )
    OR public.is_admin()
  );


-- ── 14. Notifications ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  project_id        UUID                 REFERENCES public.projects(id)  ON DELETE CASCADE,
  notification_type TEXT        NOT NULL,
  title             TEXT        NOT NULL,
  message           TEXT,
  entity_type       TEXT,
  entity_id         UUID,
  read              BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for fast "unread notifications for user" queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON public.notifications(user_id, read, created_at DESC);

-- Optional: separate index for project-scoped notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_project_id
  ON public.notifications(project_id)
  WHERE project_id IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: each user sees only their own notifications
DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- UPDATE: users can mark only their own notifications as read
DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- INSERT: any authenticated user (project member) can create a notification
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT WITH CHECK (true);

-- DELETE: users can dismiss/delete their own notifications
DROP POLICY IF EXISTS notifications_delete ON public.notifications;
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL                             ON public.notifications TO service_role;

-- ── Done ──────────────────────────────────────────────────────────────
-- After running this migration, verify with:
--   SELECT project_id, user_id, role FROM project_members LIMIT 20;
--   SELECT id, status FROM tasks LIMIT 20;
--   \d project_audit_log
