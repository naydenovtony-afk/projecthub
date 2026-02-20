-- Bootstrap demo/auth users and seed demo project data
-- Safe to run once through migrations. Uses idempotent checks to avoid duplicates.

DO $$
DECLARE
    demo_user_id UUID;
    admin_user_id UUID;
    existing_projects_count INTEGER := 0;
    proj1_id UUID;
    proj2_id UUID;
    proj3_id UUID;
    proj4_id UUID;
    proj5_id UUID;
BEGIN
    -- 1) Ensure demo auth user exists
    SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@projecthub.com' LIMIT 1;

    IF demo_user_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_sent_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000'::uuid,
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'demo@projecthub.com',
            extensions.crypt('Demo12345!', extensions.gen_salt('bf'::text)),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Demo User"}'::jsonb,
            now(),
            now()
        )
        RETURNING id INTO demo_user_id;

        RAISE NOTICE 'Created auth user: demo@projecthub.com';
    END IF;

    -- 2) Ensure admin auth user exists
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@projecthub.com' LIMIT 1;

    IF admin_user_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_sent_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000'::uuid,
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'admin@projecthub.com',
            extensions.crypt('Admin12345!', extensions.gen_salt('bf'::text)),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"full_name":"Admin User"}'::jsonb,
            now(),
            now()
        )
        RETURNING id INTO admin_user_id;

        RAISE NOTICE 'Created auth user: admin@projecthub.com';
    END IF;

    -- 3) Ensure profiles metadata/roles are correct
    UPDATE public.profiles
    SET role = 'user', full_name = COALESCE(full_name, 'Demo User'), bio = COALESCE(bio, 'Exploring ProjectHub features')
    WHERE id = demo_user_id;

    UPDATE public.profiles
    SET role = 'admin', full_name = COALESCE(full_name, 'Admin User'), bio = COALESCE(bio, 'System Administrator')
    WHERE id = admin_user_id;

    -- Ensure explicit admin RBAC record exists
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT admin_user_id, r.id
    FROM public.roles r
    WHERE r.name = 'admin'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- 4) Seed demo data only if demo user still has no projects
    SELECT COUNT(*)::INTEGER
    INTO existing_projects_count
    FROM public.projects
    WHERE user_id = demo_user_id;

    IF existing_projects_count > 0 THEN
        RAISE NOTICE 'Skipping project/task/update seed: demo user already has % project(s).', existing_projects_count;
        RETURN;
    END IF;

    INSERT INTO public.projects (
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

    INSERT INTO public.projects (
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

    INSERT INTO public.projects (
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

    INSERT INTO public.projects (
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

    INSERT INTO public.projects (
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

    INSERT INTO public.tasks (project_id, title, description, status, priority, due_date, assigned_to, created_at, updated_at) VALUES
    (proj1_id, 'Literature review and background research', 'Comprehensive review of existing research on AI in project management', 'done', 'high', NULL, demo_user_id, '2025-10-05 09:00:00+00', '2025-11-10 16:30:00+00'),
    (proj1_id, 'Design research methodology', 'Create detailed research methodology and data collection plan', 'done', 'high', NULL, demo_user_id, '2025-10-10 10:00:00+00', '2025-11-20 14:00:00+00'),
    (proj1_id, 'Conduct interviews with industry experts', 'Schedule and conduct 15-20 interviews with PM professionals', 'in_progress', 'medium', '2026-02-28', demo_user_id, '2025-11-01 11:00:00+00', '2026-01-15 13:20:00+00'),
    (proj1_id, 'Analyze collected data', 'Statistical analysis and pattern identification', 'todo', 'high', '2026-04-30', NULL, '2025-11-15 12:00:00+00', '2025-11-15 12:00:00+00'),
    (proj1_id, 'Prepare final research paper', 'Write and format research findings for publication', 'todo', 'medium', '2026-06-15', NULL, '2025-12-01 13:00:00+00', '2025-12-01 13:00:00+00'),
    (proj2_id, 'Create wireframes and mockups', 'Design comprehensive wireframes for all major pages', 'done', 'high', NULL, demo_user_id, '2025-11-05 09:30:00+00', '2025-11-25 17:00:00+00'),
    (proj2_id, 'Develop homepage and main sections', 'Frontend development with responsive design', 'in_progress', 'high', '2026-02-01', demo_user_id, '2025-11-20 10:00:00+00', '2026-01-14 15:30:00+00'),
    (proj2_id, 'Implement CMS integration', 'Integrate headless CMS for content management', 'in_progress', 'medium', '2026-02-15', demo_user_id, '2025-12-01 11:00:00+00', '2026-01-12 14:20:00+00'),
    (proj2_id, 'Testing and quality assurance', 'Comprehensive testing including functionality and performance', 'todo', 'high', '2026-03-01', NULL, '2025-12-10 12:00:00+00', '2025-12-10 12:00:00+00'),
    (proj3_id, 'Submit project proposal to EU commission', 'Prepare and submit comprehensive project proposal', 'done', 'high', NULL, demo_user_id, '2025-11-01 08:00:00+00', '2025-12-15 16:00:00+00'),
    (proj3_id, 'Partner recruitment and agreements', 'Recruit partner organizations from 5 EU countries', 'in_progress', 'high', '2026-01-31', demo_user_id, '2025-12-15 09:00:00+00', '2026-01-10 11:15:00+00'),
    (proj3_id, 'Develop training curriculum', 'Create comprehensive digital skills curriculum', 'todo', 'medium', '2026-03-15', NULL, '2026-01-05 10:00:00+00', '2026-01-05 10:00:00+00'),
    (proj4_id, 'Secure funding and government approvals', 'Obtain funding and regulatory approvals', 'done', 'high', NULL, demo_user_id, '2025-07-05 08:00:00+00', '2025-08-01 17:00:00+00'),
    (proj4_id, 'Establish mobile clinic schedule', 'Create schedule for mobile clinic visits', 'done', 'medium', NULL, demo_user_id, '2025-08-01 09:00:00+00', '2025-09-15 16:00:00+00'),
    (proj4_id, 'Community outreach and registration', 'Conduct outreach and register participants', 'in_progress', 'medium', '2026-02-01', demo_user_id, '2025-09-01 10:00:00+00', '2026-01-13 14:50:00+00'),
    (proj4_id, 'Campaign evaluation and final reporting', 'Evaluate effectiveness and prepare report', 'todo', 'low', '2026-03-31', NULL, '2025-10-01 11:00:00+00', '2025-10-01 11:00:00+00'),
    (proj5_id, 'Design responsive layout and UI', 'Create modern, responsive design', 'done', 'medium', NULL, demo_user_id, '2024-01-15 10:00:00+00', '2024-02-28 15:00:00+00'),
    (proj5_id, 'Implement blog with Markdown support', 'Build blog functionality', 'done', 'medium', NULL, demo_user_id, '2024-03-01 11:00:00+00', '2024-05-15 16:00:00+00'),
    (proj5_id, 'Deploy to production with CI/CD', 'Set up deployment pipeline', 'done', 'high', NULL, demo_user_id, '2024-06-15 12:00:00+00', '2024-06-30 18:00:00+00');

    INSERT INTO public.project_updates (project_id, user_id, update_type, update_text, metadata, created_at) VALUES
    (proj1_id, demo_user_id, 'milestone', 'Project kickoff meeting completed successfully', '{}'::jsonb, '2025-10-01 14:00:00+00'),
    (proj1_id, demo_user_id, 'task_completed', 'Completed comprehensive literature review phase', '{}'::jsonb, '2025-11-15 16:30:00+00'),
    (proj1_id, demo_user_id, 'general', 'Monthly progress update: 65% complete, on track for June delivery', '{}'::jsonb, '2026-01-10 10:00:00+00'),
    (proj2_id, demo_user_id, 'milestone', 'Design phase completed - mockups approved', '{}'::jsonb, '2025-12-01 15:00:00+00'),
    (proj2_id, demo_user_id, 'general', 'Homepage development 70% complete', '{}'::jsonb, '2026-01-12 14:20:00+00'),
    (proj3_id, demo_user_id, 'status_changed', 'Project status changed to Planning after approval', '{}'::jsonb, '2026-01-02 09:00:00+00'),
    (proj3_id, demo_user_id, 'milestone', 'Received EU commission approval - €250,000 confirmed', '{}'::jsonb, '2026-01-08 11:00:00+00'),
    (proj4_id, demo_user_id, 'milestone', 'Successfully conducted 50+ vaccination sessions', '{}'::jsonb, '2026-01-05 13:00:00+00'),
    (proj4_id, demo_user_id, 'general', 'Reached 5,000 community members milestone', '{}'::jsonb, '2026-01-13 15:10:00+00'),
    (proj5_id, demo_user_id, 'status_changed', 'Project marked as completed', '{}'::jsonb, '2024-06-30 18:00:00+00');

    RAISE NOTICE 'Demo bootstrap complete. Login users created/ensured + data seeded.';
    RAISE NOTICE 'Demo credentials => demo@projecthub.com / Demo12345!';
    RAISE NOTICE 'Admin credentials => admin@projecthub.com / Admin12345!';
END $$;
