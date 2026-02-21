-- Fix seeded auth users by ensuring password identity rows exist.
-- Without auth.identities entries, email/password sign-in fails with invalid credentials.

DO $$
DECLARE
    v_demo_id uuid;
    v_admin_id uuid;
BEGIN
    SELECT id INTO v_demo_id FROM auth.users WHERE email = 'demo@projecthub.com' LIMIT 1;
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@projecthub.com' LIMIT 1;

    IF v_demo_id IS NOT NULL THEN
        -- Normalize auth.users metadata and password
        UPDATE auth.users
        SET
            encrypted_password = extensions.crypt('Demo12345!', extensions.gen_salt('bf'::text)),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name":"Demo User"}'::jsonb,
            updated_at = now()
        WHERE id = v_demo_id;

        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            v_demo_id,
            jsonb_build_object('sub', v_demo_id::text, 'email', 'demo@projecthub.com'),
            'email',
            v_demo_id::text,
            now(),
            now(),
            now()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;

        RAISE NOTICE 'Ensured auth identity for demo@projecthub.com';
    END IF;

    IF v_admin_id IS NOT NULL THEN
        UPDATE auth.users
        SET
            encrypted_password = extensions.crypt('Admin12345!', extensions.gen_salt('bf'::text)),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name":"Admin User"}'::jsonb,
            updated_at = now()
        WHERE id = v_admin_id;

        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            v_admin_id,
            jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@projecthub.com'),
            'email',
            v_admin_id::text,
            now(),
            now(),
            now()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;

        -- Keep application admin role in profile and RBAC table
        UPDATE public.profiles
        SET role = 'admin', full_name = COALESCE(full_name, 'Admin User')
        WHERE id = v_admin_id;

        INSERT INTO public.user_roles (user_id, role_id)
        SELECT v_admin_id, r.id
        FROM public.roles r
        WHERE r.name = 'admin'
        ON CONFLICT (user_id, role_id) DO NOTHING;

        RAISE NOTICE 'Ensured auth identity for admin@projecthub.com';
    END IF;
END $$;
