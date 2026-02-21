-- Activate recreated admin user and ensure application admin role mappings.

DO $$
DECLARE
    v_admin_id uuid;
BEGIN
    SELECT id INTO v_admin_id
    FROM auth.users
    WHERE email = 'admin@projecthub.com'
    LIMIT 1;

    IF v_admin_id IS NULL THEN
        RAISE NOTICE 'Admin user not found, skipping activation.';
        RETURN;
    END IF;

    UPDATE auth.users
    SET
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_admin_id;

    UPDATE public.profiles
    SET
        role = 'admin',
        full_name = COALESCE(full_name, 'Admin User'),
        bio = COALESCE(bio, 'System Administrator'),
        updated_at = now()
    WHERE id = v_admin_id;

    INSERT INTO public.user_roles (user_id, role_id)
    SELECT v_admin_id, r.id
    FROM public.roles r
    WHERE r.name = 'admin'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    RAISE NOTICE 'Admin user activated and role mappings ensured.';
END $$;
