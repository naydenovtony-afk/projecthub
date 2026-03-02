-- ============================================================
-- Project Invitations Table
-- Email-based invitation system for adding members
-- ============================================================

CREATE TABLE IF NOT EXISTS project_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('project_manager', 'project_coordinator', 'team_member')),
  message     TEXT,
  invited_by  UUID NOT NULL REFERENCES profiles(id),
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  token       UUID DEFAULT gen_random_uuid() UNIQUE, -- magic invite link token
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_invitations_email   ON project_invitations(email, status);
CREATE INDEX IF NOT EXISTS idx_invitations_project ON project_invitations(project_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_token   ON project_invitations(token);

-- RLS
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- Project members can see invitations for their projects
CREATE POLICY invitations_select ON project_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_invitations.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Only PM/PC can create invitations
CREATE POLICY invitations_insert ON project_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_invitations.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('project_manager', 'project_coordinator')
    )
  );

-- Service role (edge function) can update status
CREATE POLICY invitations_update ON project_invitations
  FOR UPDATE USING (auth.role() = 'service_role');
