-- =====================================================
-- Contacts & Project Sharing Schema
-- Add to existing ProjectHub database
-- =====================================================

-- =====================================================
-- Table: contacts
-- Stores user contacts/collaborators
-- =====================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL if contact not registered yet
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  job_title TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  notes TEXT, -- Optional notes about the contact
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_collaboration TIMESTAMP WITH TIME ZONE,
  
  -- Prevent duplicate contacts
  UNIQUE(user_id, email)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_favorite ON contacts(user_id, is_favorite);

-- Comments
COMMENT ON TABLE contacts IS 'User contacts and collaborators';
COMMENT ON COLUMN contacts.contact_user_id IS 'References profiles.id if contact is registered user, NULL otherwise';
COMMENT ON COLUMN contacts.is_favorite IS 'User can mark frequently used contacts as favorites';

-- =====================================================
-- Table: project_shares
-- Tracks which projects are shared with which contacts
-- =====================================================
CREATE TABLE IF NOT EXISTS project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'viewer' CHECK (permission_level IN ('viewer', 'contributor', 'editor')),
  share_token TEXT UNIQUE, -- Optional: for shareable links
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE,
  
  -- Prevent sharing same project with same contact multiple times
  UNIQUE(project_id, contact_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_shares_project ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_contact ON project_shares(contact_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_token ON project_shares(share_token);

-- Comments
COMMENT ON TABLE project_shares IS 'Tracks project sharing with contacts and permissions';
COMMENT ON COLUMN project_shares.permission_level IS 'viewer: read-only, contributor: can add tasks/files, editor: full edit access';
COMMENT ON COLUMN project_shares.share_token IS 'Unique token for shareable links (optional feature)';

-- =====================================================
-- Table: contact_project_association
-- Junction table: which projects a contact is associated with
-- (Derived from project_shares, but can track all collaborations)
-- =====================================================
-- Note: This can be derived from project_shares, tasks.assigned_to, etc.
-- Not creating separate table for now, using views instead

-- =====================================================
-- View: contact_projects
-- Shows all projects a contact is associated with
-- =====================================================
CREATE OR REPLACE VIEW contact_projects AS
SELECT DISTINCT
  c.id AS contact_id,
  c.user_id,
  p.id AS project_id,
  p.title AS project_title,
  ps.permission_level,
  ps.shared_at
FROM contacts c
JOIN project_shares ps ON c.id = ps.contact_id
JOIN projects p ON ps.project_id = p.id;

COMMENT ON VIEW contact_projects IS 'Shows all projects associated with each contact';

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- Contacts: Users can view and manage their own contacts
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contacts"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all contacts
CREATE POLICY "Admins can view all contacts"
  ON contacts FOR SELECT
  USING (public.is_admin());

-- Project Shares: Users can manage shares for their own projects
CREATE POLICY "Users can view shares for their projects"
  ON project_shares FOR SELECT
  USING (
    shared_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_shares.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for their projects"
  ON project_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update shares for their projects"
  ON project_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_shares.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete shares for their projects"
  ON project_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_shares.project_id AND user_id = auth.uid()
    )
  );

-- Contacts can view projects shared with them
CREATE POLICY "Contacts can view shared projects"
  ON project_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE id = project_shares.contact_id 
      AND contact_user_id = auth.uid()
    )
  );

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function: Get contact's shared projects count
CREATE OR REPLACE FUNCTION get_contact_projects_count(contact_id_param UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT project_id)::INTEGER
  FROM project_shares
  WHERE contact_id = contact_id_param;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_contact_projects_count IS 'Returns count of projects shared with a contact';

-- Function: Update last_collaboration timestamp
CREATE OR REPLACE FUNCTION update_last_collaboration()
RETURNS TRIGGER AS $$
BEGIN
  -- Update contact's last_collaboration when activity happens
  UPDATE contacts
  SET last_collaboration = NOW()
  WHERE id IN (
    SELECT contact_id FROM project_shares WHERE project_id = NEW.project_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update last_collaboration on task/file/update creation
CREATE TRIGGER trigger_update_collaboration_on_task
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_last_collaboration();

CREATE TRIGGER trigger_update_collaboration_on_file
  AFTER INSERT ON project_files
  FOR EACH ROW
  EXECUTE FUNCTION update_last_collaboration();

CREATE TRIGGER trigger_update_collaboration_on_update
  AFTER INSERT ON project_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_last_collaboration();

-- =====================================================
-- Sample Queries (for testing)
-- =====================================================

-- Get all contacts for a user with project counts
-- SELECT 
--   c.*,
--   get_contact_projects_count(c.id) as projects_together_count
-- FROM contacts c
-- WHERE c.user_id = 'user_id_here'
-- ORDER BY c.is_favorite DESC, c.added_at DESC;

-- Get all projects shared with a specific contact
-- SELECT p.*, ps.permission_level, ps.shared_at
-- FROM projects p
-- JOIN project_shares ps ON p.id = ps.project_id
-- WHERE ps.contact_id = 'contact_id_here';

-- Get all people who have access to a project
-- SELECT c.name, c.email, c.company, ps.permission_level
-- FROM contacts c
-- JOIN project_shares ps ON c.id = ps.contact_id
-- WHERE ps.project_id = 'project_id_here';

-- =====================================================
-- Verification
-- =====================================================

-- Check tables created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('contacts', 'project_shares');

-- Check RLS enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN ('contacts', 'project_shares');
