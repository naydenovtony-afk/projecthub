-- =====================================================
-- ProjectHub Demo Data Seed Script
-- Run this in Supabase SQL Editor to populate database
-- =====================================================

-- Clean existing demo data (optional - comment out if you want to keep)
-- DELETE FROM project_updates WHERE user_id IN (SELECT id FROM profiles WHERE email IN ('demo@projecthub.com', 'admin@projecthub.com'));
-- DELETE FROM project_files WHERE project_id IN (SELECT id FROM projects WHERE user_id IN (SELECT id FROM profiles WHERE email IN ('demo@projecthub.com', 'admin@projecthub.com')));
-- DELETE FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE user_id IN (SELECT id FROM profiles WHERE email IN ('demo@projecthub.com', 'admin@projecthub.com')));
-- DELETE FROM projects WHERE user_id IN (SELECT id FROM profiles WHERE email IN ('demo@projecthub.com', 'admin@projecthub.com'));
-- DELETE FROM profiles WHERE email IN ('demo@projecthub.com', 'admin@projecthub.com');

-- Note: You cannot directly insert into auth.users table via SQL
-- Demo users must be created via the register page first!
-- After creating accounts via UI, find their UUIDs and use them below

-- =====================================================
-- STEP 1: Create demo user profiles
-- =====================================================
-- After registering demo@projecthub.com via the app, run:
-- UPDATE profiles SET role = 'user', full_name = 'Demo User', bio = 'Exploring ProjectHub features' WHERE email = 'demo@projecthub.com';

-- After registering admin@projecthub.com via the app, run:
-- UPDATE profiles SET role = 'admin', full_name = 'Admin User', bio = 'System Administrator' WHERE email = 'admin@projecthub.com';

-- =====================================================
-- STEP 2: Get demo user UUID
-- =====================================================
-- Run this to get the UUID:
-- SELECT id, email, full_name, role FROM profiles WHERE email IN ('demo@projecthub.com', 'admin@projecthub.com');

-- Replace DEMO_USER_ID below with the actual UUID from the query above

DO $$
DECLARE
    demo_user_id UUID;
    proj1_id UUID;
    proj2_id UUID;
    proj3_id UUID;
    proj4_id UUID;
    proj5_id UUID;
BEGIN
    -- Get demo user ID
    SELECT id INTO demo_user_id FROM profiles WHERE email = 'demo@projecthub.com';
    
    -- Check if demo user exists
    IF demo_user_id IS NULL THEN
        RAISE EXCEPTION 'Demo user not found. Please create demo@projecthub.com account first via the register page.';
    END IF;
    
    -- =====================================================
    -- STEP 3: Create Projects
    -- =====================================================
    
    -- Project 1: Research Project Alpha
    INSERT INTO projects (
        id, user_id, title, description, project_type, status, visibility,
        start_date, end_date, budget, funding_source, progress_percentage,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), demo_user_id,
        'Research Project Alpha',
        'Comprehensive research on AI applications in project management. This multi-year study examines how artificial intelligence can optimize project workflows, predict risks, and improve team collaboration across diverse project environments.',
        'Academic & Research', 'active', 'public',
        '2025-10-01', '2026-06-30', 85000, 'National Science Foundation', 65,
        '2025-10-01 08:00:00+00', '2026-01-15 14:30:00+00'
    ) RETURNING id INTO proj1_id;
    
    -- Project 2: Corporate Website Redesign
    INSERT INTO projects (
        id, user_id, title, description, project_type, status, visibility,
        start_date, end_date, budget, funding_source, progress_percentage,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), demo_user_id,
        'Corporate Website Redesign',
        'Complete overhaul of company website with modern design, improved UX, and responsive layout. Includes new CMS integration, performance optimization, and accessibility improvements.',
        'Corporate/Business', 'active', 'private',
        '2025-11-01', NULL, 45000, NULL, 45,
        '2025-11-01 09:00:00+00', '2026-01-14 16:45:00+00'
    ) RETURNING id INTO proj2_id;
    
    -- Project 3: EU Digital Skills Initiative
    INSERT INTO projects (
        id, user_id, title, description, project_type, status, visibility,
        start_date, end_date, budget, funding_source, progress_percentage,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), demo_user_id,
        'EU Digital Skills Initiative',
        'Multi-country initiative to improve digital literacy across underserved communities. Partnership with 5 EU member states to deliver comprehensive training programs.',
        'EU-Funded Project', 'planning', 'public',
        '2026-02-01', '2027-12-31', 250000, 'Erasmus+ Programme', 15,
        '2026-01-01 10:00:00+00', '2026-01-10 11:20:00+00'
    ) RETURNING id INTO proj3_id;
    
    -- Project 4: Public Health Campaign
    INSERT INTO projects (
        id, user_id, title, description, project_type, status, visibility,
        start_date, end_date, budget, funding_source, progress_percentage,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), demo_user_id,
        'Public Health Campaign',
        'Community health awareness and vaccination campaign targeting rural areas. Includes mobile clinics, educational workshops, and social media outreach.',
        'Public Initiative', 'active', 'public',
        '2025-07-01', '2026-03-31', 120000, 'Ministry of Health', 80,
        '2025-07-01 08:30:00+00', '2026-01-13 15:10:00+00'
    ) RETURNING id INTO proj4_id;
    
    -- Project 5: Personal Portfolio Website
    INSERT INTO projects (
        id, user_id, title, description, project_type, status, visibility,
        start_date, end_date, budget, funding_source, progress_percentage,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), demo_user_id,
        'Personal Portfolio Website',
        'Personal developer portfolio showcasing projects, blog posts, and technical articles. Built with modern web technologies.',
        'Personal/Other', 'completed', 'public',
        '2024-01-01', '2024-06-30', NULL, NULL, 100,
        '2024-01-01 12:00:00+00', '2024-06-30 18:00:00+00'
    ) RETURNING id INTO proj5_id;
    
    -- =====================================================
    -- STEP 4: Create Tasks
    -- =====================================================
    
    -- Project 1 Tasks
    INSERT INTO tasks (project_id, title, description, status, priority, due_date, assigned_to, created_at, updated_at) VALUES
    (proj1_id, 'Literature review and background research', 'Comprehensive review of existing research on AI in project management', 'done', 'high', NULL, demo_user_id, '2025-10-05 09:00:00+00', '2025-11-10 16:30:00+00'),
    (proj1_id, 'Design research methodology', 'Create detailed research methodology and data collection plan', 'done', 'high', NULL, demo_user_id, '2025-10-10 10:00:00+00', '2025-11-20 14:00:00+00'),
    (proj1_id, 'Conduct interviews with industry experts', 'Schedule and conduct 15-20 interviews with PM professionals', 'in_progress', 'medium', '2026-02-28', demo_user_id, '2025-11-01 11:00:00+00', '2026-01-15 13:20:00+00'),
    (proj1_id, 'Analyze collected data', 'Statistical analysis and pattern identification', 'todo', 'high', '2026-04-30', NULL, '2025-11-15 12:00:00+00', '2025-11-15 12:00:00+00'),
    (proj1_id, 'Prepare final research paper', 'Write and format research findings for publication', 'todo', 'medium', '2026-06-15', NULL, '2025-12-01 13:00:00+00', '2025-12-01 13:00:00+00');
    
    -- Project 2 Tasks
    INSERT INTO tasks (project_id, title, description, status, priority, due_date, assigned_to, created_at, updated_at) VALUES
    (proj2_id, 'Create wireframes and mockups', 'Design comprehensive wireframes for all major pages', 'done', 'high', NULL, demo_user_id, '2025-11-05 09:30:00+00', '2025-11-25 17:00:00+00'),
    (proj2_id, 'Develop homepage and main sections', 'Frontend development with responsive design', 'in_progress', 'high', '2026-02-01', demo_user_id, '2025-11-20 10:00:00+00', '2026-01-14 15:30:00+00'),
    (proj2_id, 'Implement CMS integration', 'Integrate headless CMS for content management', 'in_progress', 'medium', '2026-02-15', demo_user_id, '2025-12-01 11:00:00+00', '2026-01-12 14:20:00+00'),
    (proj2_id, 'Testing and quality assurance', 'Comprehensive testing including functionality and performance', 'todo', 'high', '2026-03-01', NULL, '2025-12-10 12:00:00+00', '2025-12-10 12:00:00+00');
    
    -- Project 3 Tasks
    INSERT INTO tasks (project_id, title, description, status, priority, due_date, assigned_to, created_at, updated_at) VALUES
    (proj3_id, 'Submit project proposal to EU commission', 'Prepare and submit comprehensive project proposal', 'done', 'high', NULL, demo_user_id, '2025-11-01 08:00:00+00', '2025-12-15 16:00:00+00'),
    (proj3_id, 'Partner recruitment and agreements', 'Recruit partner organizations from 5 EU countries', 'in_progress', 'high', '2026-01-31', demo_user_id, '2025-12-15 09:00:00+00', '2026-01-10 11:15:00+00'),
    (proj3_id, 'Develop training curriculum', 'Create comprehensive digital skills curriculum', 'todo', 'medium', '2026-03-15', NULL, '2026-01-05 10:00:00+00', '2026-01-05 10:00:00+00');
    
    -- Project 4 Tasks
    INSERT INTO tasks (project_id, title, description, status, priority, due_date, assigned_to, created_at, updated_at) VALUES
    (proj4_id, 'Secure funding and government approvals', 'Obtain funding and regulatory approvals', 'done', 'high', NULL, demo_user_id, '2025-07-05 08:00:00+00', '2025-08-01 17:00:00+00'),
    (proj4_id, 'Establish mobile clinic schedule', 'Create schedule for mobile clinic visits', 'done', 'medium', NULL, demo_user_id, '2025-08-01 09:00:00+00', '2025-09-15 16:00:00+00'),
    (proj4_id, 'Community outreach and registration', 'Conduct outreach and register participants', 'in_progress', 'medium', '2026-02-01', demo_user_id, '2025-09-01 10:00:00+00', '2026-01-13 14:50:00+00'),
    (proj4_id, 'Campaign evaluation and final reporting', 'Evaluate effectiveness and prepare report', 'todo', 'low', '2026-03-31', NULL, '2025-10-01 11:00:00+00', '2025-10-01 11:00:00+00');
    
    -- Project 5 Tasks
    INSERT INTO tasks (project_id, title, description, status, priority, due_date, assigned_to, created_at, updated_at) VALUES
    (proj5_id, 'Design responsive layout and UI', 'Create modern, responsive design', 'done', 'medium', NULL, demo_user_id, '2024-01-15 10:00:00+00', '2024-02-28 15:00:00+00'),
    (proj5_id, 'Implement blog with Markdown support', 'Build blog functionality', 'done', 'medium', NULL, demo_user_id, '2024-03-01 11:00:00+00', '2024-05-15 16:00:00+00'),
    (proj5_id, 'Deploy to production with CI/CD', 'Set up deployment pipeline', 'done', 'high', NULL, demo_user_id, '2024-06-15 12:00:00+00', '2024-06-30 18:00:00+00');
    
    -- =====================================================
    -- STEP 5: Create Project Updates
    -- =====================================================
    
    INSERT INTO project_updates (project_id, user_id, update_type, update_text, metadata, created_at) VALUES
    (proj1_id, demo_user_id, 'milestone', 'Project kickoff meeting completed successfully', '{}', '2025-10-01 14:00:00+00'),
    (proj1_id, demo_user_id, 'task_completed', 'Completed comprehensive literature review phase', '{}', '2025-11-15 16:30:00+00'),
    (proj1_id, demo_user_id, 'general', 'Monthly progress update: 65% complete, on track for June delivery', '{}', '2026-01-10 10:00:00+00'),
    (proj2_id, demo_user_id, 'milestone', 'Design phase completed - mockups approved', '{}', '2025-12-01 15:00:00+00'),
    (proj2_id, demo_user_id, 'general', 'Homepage development 70% complete', '{}', '2026-01-12 14:20:00+00'),
    (proj3_id, demo_user_id, 'status_changed', 'Project status changed to Planning after approval', '{}', '2026-01-02 09:00:00+00'),
    (proj3_id, demo_user_id, 'milestone', 'Received EU commission approval - €250,000 confirmed', '{}', '2026-01-08 11:00:00+00'),
    (proj4_id, demo_user_id, 'milestone', 'Successfully conducted 50+ vaccination sessions', '{}', '2026-01-05 13:00:00+00'),
    (proj4_id, demo_user_id, 'general', 'Reached 5,000 community members milestone', '{}', '2026-01-13 15:10:00+00'),
    (proj5_id, demo_user_id, 'status_changed', 'Project marked as completed', '{}', '2024-06-30 18:00:00+00');
    
    RAISE NOTICE 'Demo data created successfully!';
    RAISE NOTICE 'Projects: 5, Tasks: 19, Updates: 10';
    
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify data was created:

-- SELECT COUNT(*) as project_count FROM projects WHERE user_id = (SELECT id FROM profiles WHERE email = 'demo@projecthub.com');
-- SELECT COUNT(*) as task_count FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE user_id = (SELECT id FROM profiles WHERE email = 'demo@projecthub.com'));
-- SELECT COUNT(*) as update_count FROM project_updates WHERE user_id = (SELECT id FROM profiles WHERE email = 'demo@projecthub.com');

-- View all projects:
-- SELECT id, title, project_type, status, progress_percentage FROM projects WHERE user_id = (SELECT id FROM profiles WHERE email = 'demo@projecthub.com') ORDER BY created_at DESC;
