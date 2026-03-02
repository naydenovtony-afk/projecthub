-- Backfill PM membership rows for project creators who have no project_members row.
-- Also handles any projects created before the createProject fix.

INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, p.user_id, 'project_manager'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = p.id
    AND pm.user_id    = p.user_id
)
ON CONFLICT (project_id, user_id) DO NOTHING;
